import { fireEvent, render, wait } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';

import { DashboardThumbnail } from '.';
import { useThumbnail } from '../../data/stores/useThumbnail';
import { uploadState } from '../../types/tracks';
import { wrapInIntlProvider } from '../../utils/tests/intl';
import { jestMockOf } from '../../utils/types';

jest.mock('react-router-dom', () => ({
  Redirect: ({ push, to }: { push: boolean; to: string }) =>
    `Redirect push to ${to}.`,
}));

jest.mock('../../data/appData', () => ({
  appData: {
    jwt: 'some token',
  },
}));

jest.mock('../../data/stores/useThumbnail', () => ({
  useThumbnail: jest.fn(),
}));
const mockUseThumbnail = useThumbnail as jestMockOf<typeof useThumbnail>;
const mockAddThumbnail = jest.fn();

describe('<DashboardThumbnail />', () => {
  afterEach(jest.resetAllMocks);

  const video = {
    description: '',
    id: '43',
    is_ready_to_show: true,
    show_download: true,
    thumbnail: {
      active_stamp: 128748302847,
      id: '42',
      is_ready_to_show: true,
      upload_state: uploadState.READY,
      urls: {
        144: 'https://example.com/thumbnail/144',
        240: 'https://example.com/thumbnail/240',
        480: 'https://example.com/thumbnail/480',
        720: 'https://example.com/thumbnail/720',
        1080: 'https://example.com/thumbnail/1080',
      },
      video: '43',
    },
    timed_text_tracks: [],
    title: '',
    upload_state: uploadState.READY,
    urls: {
      manifests: {
        dash: 'https://example.com/dash',
        hls: 'https://example.com/hls',
      },
      mp4: {
        144: 'https://example.com/mp4/144',
        240: 'https://example.com/mp4/240',
        480: 'https://example.com/mp4/480',
        720: 'https://example.com/mp4/720',
        1080: 'https://example.com/mp4/1080',
      },
      thumbnails: {
        144: 'https://example.com/default_thumbnail/144',
        240: 'https://example.com/default_thumbnail/240',
        480: 'https://example.com/default_thumbnail/480',
        720: 'https://example.com/default_thumbnail/720',
        1080: 'https://example.com/default_thumbnail/1080',
      },
    },
  };

  it('displays a thumbnail image when the related Thumbnail object is ready', () => {
    mockUseThumbnail.mockReturnValue({
      addThumbnail: mockAddThumbnail,
      thumbnail: video.thumbnail,
    });
    const { getByAltText, queryByText } = render(
      wrapInIntlProvider(<DashboardThumbnail video={video} />),
    );

    // The progress indicator, processing message & error message are not shown
    expect(queryByText('0%')).toEqual(null);
    expect(
      queryByText(
        'Your thumbnail is currently processing. This may take several minutes. It will appear here once done.',
      ),
    ).toEqual(null);
    expect(
      queryByText('There was an error during thumbnail creation.'),
    ).toEqual(null);
    // The thumbnail image is shown
    expect(
      getByAltText('Video thumbnail preview image.').getAttribute('src'),
    ).toEqual('https://example.com/thumbnail/144');
  });

  it('displays a thumbnail image with the autogenerated default thumbnail when there is no Thumbnail resource', () => {
    const videoWithoutThumbnail = {
      ...video,
      thumbnail: null,
    };
    mockUseThumbnail.mockReturnValue({
      addThumbnail: mockAddThumbnail,
      thumbnail: null,
    });

    const { getByAltText, queryByText } = render(
      wrapInIntlProvider(<DashboardThumbnail video={videoWithoutThumbnail} />),
    );

    // The progress indicator, processing message & error message are not shown
    expect(queryByText('0%')).toEqual(null);
    expect(
      queryByText(
        'Your thumbnail is currently processing. This may take several minutes. It will appear here once done.',
      ),
    ).toEqual(null);
    expect(
      queryByText('There was an error during thumbnail creation.'),
    ).toEqual(null);
    // The thumbnail image is shown
    expect(
      getByAltText('Video thumbnail preview image.').getAttribute('src'),
    ).toEqual('https://example.com/default_thumbnail/144');
  });

  it('displays a progress bar when the Thumbnail status is uploading', () => {
    const videoWithLoadingThumbnail = {
      ...video,
      thumbnail: {
        ...video.thumbnail,
        upload_state: uploadState.UPLOADING,
      },
    };

    mockUseThumbnail.mockReturnValue({
      addThumbnail: mockAddThumbnail,
      thumbnail: {
        ...video.thumbnail,
        upload_state: uploadState.UPLOADING,
      },
    });

    const { getByText, queryByAltText, queryByText } = render(
      wrapInIntlProvider(
        <DashboardThumbnail video={videoWithLoadingThumbnail} />,
      ),
    );

    // The thumbnail image, processing message & error message are not shown
    expect(queryByAltText('Video thumbnail preview image.')).toEqual(null);
    expect(
      queryByText(
        'Your thumbnail is currently processing. This may take several minutes. It will appear here once done.',
      ),
    ).toEqual(null);
    expect(
      queryByText('There was an error during thumbnail creation.'),
    ).toEqual(null);
    // The progress indicator is shown
    getByText('0%');
  });

  it('displays an explanatory message when a thumbnail is processing', () => {
    const videoWithProcessingThumbnail = {
      ...video,
      thumbnail: {
        ...video.thumbnail,
        upload_state: uploadState.PROCESSING,
      },
    };

    mockUseThumbnail.mockReturnValue({
      addThumbnail: mockAddThumbnail,
      thumbnail: {
        ...video.thumbnail,
        upload_state: uploadState.PROCESSING,
      },
    });

    const { getByText, queryByAltText, queryByText } = render(
      wrapInIntlProvider(
        <DashboardThumbnail video={videoWithProcessingThumbnail} />,
      ),
    );

    // The thumbnail image, progress indicator & error message are not shown
    expect(queryByAltText('Video thumbnail preview image.')).toEqual(null);
    expect(queryByText('0%')).toEqual(null);
    expect(
      queryByText('There was an error during thumbnail creation.'),
    ).toEqual(null);
    // The processing message is shown
    getByText(
      'Your thumbnail is currently processing. This may take several minutes. It will appear here once done.',
    );
  });

  it('displays an error message when there is an issue with a thumbnail', () => {
    const videoWithErroredThumbnail = {
      ...video,
      thumbnail: {
        ...video.thumbnail,
        upload_state: uploadState.ERROR,
      },
    };

    mockUseThumbnail.mockReturnValue({
      addThumbnail: mockAddThumbnail,
      thumbnail: {
        ...video.thumbnail,
        upload_state: uploadState.ERROR,
      },
    });

    const { getByText, queryByAltText, queryByText } = render(
      wrapInIntlProvider(
        <DashboardThumbnail video={videoWithErroredThumbnail} />,
      ),
    );

    // The thumbnail image, progress indicator & processing message are not shown
    expect(queryByAltText('Video thumbnail preview image.')).toEqual(null);
    expect(queryByText('0%')).toEqual(null);
    expect(
      queryByText(
        'Your thumbnail is currently processing. This may take several minutes. It will appear here once done.',
      ),
    ).toEqual(null);
    // The error message is shown
    getByText('There was an error during thumbnail creation.');
  });

  it('creates a new thumbnail and redirects the user to the upload form they click on the replace button', async () => {
    fetchMock.mock('/api/thumbnails/', JSON.stringify(video.thumbnail), {
      method: 'POST',
    });
    const videoWithoutThumbnail = {
      ...video,
      thumbnail: null,
    };

    mockUseThumbnail
      .mockReturnValueOnce({
        addThumbnail: mockAddThumbnail,
        thumbnail: null,
      })
      .mockReturnValueOnce({
        addThumbnail: mockAddThumbnail,
        thumbnail: null,
      });

    mockUseThumbnail.mockReturnValue({
      addThumbnail: mockAddThumbnail,
      thumbnail: {
        id: '42',
      },
    });

    const { debug, getByAltText, getByText } = render(
      wrapInIntlProvider(<DashboardThumbnail video={videoWithoutThumbnail} />),
    );

    expect(
      getByAltText('Video thumbnail preview image.').getAttribute('src'),
    ).toEqual('https://example.com/default_thumbnail/144');

    fireEvent.click(getByText('Replace this thumbnail'));
    await wait();
    expect(fetchMock.calls()).toHaveLength(1);
    expect(fetchMock.lastCall()![0]).toEqual('/api/thumbnails/');
    expect(fetchMock.lastCall()![1]!.headers).toEqual({
      Authorization: 'Bearer some token',
      'Content-Type': 'application/json',
    });
    expect(mockAddThumbnail).toHaveBeenCalled();
    getByText('Redirect push to /form/thumbnails/42.');
  });
});
