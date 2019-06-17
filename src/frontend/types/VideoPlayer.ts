import { Dispatch } from 'redux';

type VideoPlayerType = 'plyr';

export interface VideoPlayerInterface {
  /** Destroy the instance and garbage collect any elements. */
  destroy(): void;
}

export type VideoPlayerCreator = (
  type: VideoPlayerType,
  ref: HTMLVideoElement,
  jwt: string,
  dispatch: Dispatch,
) => VideoPlayerInterface;