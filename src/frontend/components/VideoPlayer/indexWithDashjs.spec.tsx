import { render, wait } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';

import { appData } from '../../data/appData';
import { wrapInIntlProvider } from '../../utils/tests/intl';
import VideoPlayer from './index';

jest.mock('jwt-decode', () => jest.fn());

// Simulate a browser that supports MSE and will use DashJS
jest.mock('../../utils/isAbrSupported', () => ({
  isHlsSupported: jest.fn().mockReturnValue(false),
  isMSESupported: jest.fn().mockReturnValue(true),
}));

jest.mock('../../data/appData', () => ({
  appData: {
    video: {
      description: 'Some description',
      id: 'video-id',
      is_ready_to_show: true,
      show_download: false,
      thumbnail: null,
      timed_text_tracks: [
        {
          active_stamp: 1549385921,
          id: 'ttt-1',
          is_ready_to_show: true,
          language: 'fr',
          mode: 'st',
          upload_state: 'ready',
          url: 'https://example.com/timedtext/ttt-1.vtt',
        },
        {
          active_stamp: 1549385922,
          id: 'ttt-2',
          is_ready_to_show: false,
          language: 'fr',
          mode: 'st',
          upload_state: 'ready',
          url: 'https://example.com/timedtext/ttt-2.vtt',
        },
        {
          active_stamp: 1549385923,
          id: 'ttt-3',
          is_ready_to_show: true,
          language: 'en',
          mode: 'cc',
          upload_state: 'ready',
          url: 'https://example.com/timedtext/ttt-3.vtt',
        },
        {
          active_stamp: 1549385924,
          id: 'ttt-4',
          is_ready_to_show: true,
          language: 'fr',
          mode: 'ts',
          upload_state: 'ready',
          url: 'https://example.com/timedtext/ttt-4.vtt',
        },
      ],
      title: 'Some title',
      upload_state: 'ready',
      urls: {
        manifests: {
          dash: 'https://example.com/dash.mpd',
          hls: 'https://example.com/hls.m3u8',
        },
        mp4: {
          144: 'https://example.com/144p.mp4',
          1080: 'https://example.com/1080p.mp4',
        },
        thumbnails: {
          720: 'https://example.com/144p.jpg',
        },
      },
    },
  },
}));

describe('VideoPlayer', () => {
  beforeEach(() =>
    fetchMock.mock(
      '/api/timedtexttracks/',
      {
        actions: {
          POST: {
            language: {
              choices: [
                { display_name: 'English', value: 'en' },
                { display_name: 'French', value: 'fr' },
              ],
            },
          },
        },
      },
      { method: 'OPTIONS' },
    ),
  );

  afterEach(fetchMock.restore);
  afterEach(jest.clearAllMocks);

  const createPlayer = jest.fn();

  beforeEach(() => {
    createPlayer.mockResolvedValue({
      destroy: jest.fn(),
    });
  });

  // This test just makes sure everything works when dashjs is not mocked
  it('starts up the player with DashJS', async () => {
    const { container, getByText, queryByText } = render(
      wrapInIntlProvider(
        <VideoPlayer createPlayer={createPlayer} video={appData.video!} />,
      ),
    );
    await wait();

    // The player is created and initialized with DashJS for adaptive bitrate
    expect(createPlayer).toHaveBeenCalledWith(
      'plyr',
      expect.any(Element),
      expect.anything(),
    );
    expect(queryByText(/Download this video/i)).toEqual(null);
    getByText('Show a transcript');
    expect(container.querySelectorAll('track')).toHaveLength(2);
    expect(
      container.querySelector('source[src="https://example.com/144p.mp4"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('source[src="https://example.com/1080p.mp4"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('source[type="video/mp4"]')).toHaveLength(
      2,
    );
  });
});
