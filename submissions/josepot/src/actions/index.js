import { SITHS_API, INITIAL_SITH_ID, MAX_VISIBLE_SITHS } from '../config';
import R from 'ramda';
import xhr from 'xhr';

export const OBI_WAN_MOVED = 'OBI_WAN_MOVED';
export const UP = 'UP';
export const DOWN = 'DOWN';
export const LOADING_SITH = 'LOADING_SITH';
export const ABORT_REQUEST = 'ABORT_REQUEST';
export const SITH_LOADED = 'SITH_LOADED';
const ABORT_MSG = 'Internally aborted request';

export function isHomeworldFound(state) {
  return R.containsWith(
    (planet, sith) => planet.id == sith.homeworld.id,
     state.currentPlanet, state.list.siths
  );
}

function getRequest(sithId) {
  let rawRequest;
  const promiseRequest = new Promise((resolve, reject) => {
    rawRequest = xhr({uri: `${SITHS_API}/${sithId}`}, (err, resp, body) => {
      if(err) {
        reject(resp.statusCode === 0 ? new Error(ABORT_MSG) : err);
      } else if(resp.statusCode !== 200) {
        reject(new Error(
          `Wrong Request with code: ${resp.statusCode} and body: ${body}`
        ));
      } else {
        resolve(JSON.parse(body));
      }
    });
  });

  return { id: sithId, rawRequest, promiseRequest };
}

function getOppositeDirection(direction) {
  return direction === UP ? DOWN : UP;
}

function getAvailableSpots(state, direction) {
  return direction === UP ?
    state.list.paddingTop :
    MAX_VISIBLE_SITHS - state.list.siths.length - state.list.paddingTop;
}

function getNextSith(siths, direction) {
  return siths.length > 0 &&
    (direction === UP ? R.head(siths).master : R.last(siths).apprentice);
}

function getNextSithToLoad(state, direction) {
  return !isHomeworldFound(state) &&
    getAvailableSpots(state, direction) > 0 &&
    R.isNil(state.onGoingRequests[direction]) &&
    getNextSith(state.list.siths, direction);
}

function loadSiths(directions) {
  return (dispatch, getState) => {
    directions.forEach((direction) => {
      const nextSith = getNextSithToLoad(getState(), direction);

      if(nextSith && !R.isNil(nextSith.id)) {
        const request = getRequest(nextSith.id);

        dispatch({ type: LOADING_SITH, direction, request });
        request.promiseRequest.then((sith) => {
          dispatch({ type: SITH_LOADED, direction, sith });
          dispatch(
            isHomeworldFound(getState()) ?
              cancelUnnecessaryRequests([UP, DOWN]) :
              loadSiths([direction])
          );
        }, (err) => {
          if(err.message !== ABORT_MSG) throw err;
        });
      }
    });
  }
}

function cancelUnnecessaryRequests(directions) {
  return (dispatch, getState) => {
    const state = getState();
    const homeworldFound = isHomeworldFound(state);

    directions.forEach((direction) => {
      const requestToCancel =
        (homeworldFound || getAvailableSpots(state, direction) === 0) &&
        state.onGoingRequests[direction];

      if(requestToCancel) {
        requestToCancel.rawRequest.abort();
        dispatch({ type: ABORT_REQUEST, direction });
      }
    });
  }
}

export function initialRequest() {
  return (dispatch, getState) => {
    getRequest(INITIAL_SITH_ID).promiseRequest.then((sith) => {
      dispatch({ type: SITH_LOADED, direction : DOWN, sith });
      dispatch(loadSiths([UP, DOWN]));
    });
  }
}

export function scroll(direction) {
  return (dispatch) => {
    dispatch({type: direction});
    dispatch(cancelUnnecessaryRequests([getOppositeDirection(direction)]));
    dispatch(loadSiths([direction]));
  }
}

export function obiWanMoved(planet) {
  return (dispatch, getState) => {
    const homeworldFoundPrev = isHomeworldFound(getState());
    dispatch({ type: OBI_WAN_MOVED, planet });
    const homeworldFoundPost = isHomeworldFound(getState());

    if(homeworldFoundPrev !== homeworldFoundPost) {
      const action = homeworldFoundPost ? cancelUnnecessaryRequests : loadSiths;
      R.compose(dispatch, R.partial(action, [UP, DOWN]))();
    }
  }
}
