import {
  LOADING_SITH, ABORT_REQUEST, SITH_LOADED
} from '../actions';
import { INITIAL_SITH_ID } from '../config';

const initialState = {
  UP: null,
  DOWN: {
    id: INITIAL_SITH_ID,
    rawRequest: null,
    promiseRequest: null
  }
};

export default function onGoingRequests(state = initialState, action) {
  const direction = action.direction;

  switch (action.type) {
    case LOADING_SITH:
      return Object.assign({}, state, {
        [direction]: action.request
      });
    case ABORT_REQUEST:
    case SITH_LOADED:
      return Object.assign({}, state, {
        [direction]: null
      });
    default:
      return state;
  }
}
