import { render } from '@testing-library/react';
import React from 'react';

import { wrapInIntlProvider } from '../../utils/tests/intl';
import { wrapInRouter } from '../../utils/tests/router';
import { InstructorView } from './';

jest.mock('jwt-decode', () => jest.fn());

let mockDecodedJwt: any;
jest.mock('../../data/appData', () => ({
  appData: {
    modelName: 'videos',
  },
  getDecodedJwt: () => mockDecodedJwt,
}));

describe('<InstructorView />', () => {
  it('renders the instructor controls', () => {
    mockDecodedJwt = {
      permissions: {
        can_access_dasboard: false,
      },
    };

    const { getByText } = render(
      wrapInIntlProvider(
        wrapInRouter(
          <InstructorView>
            <div className="some-child" />
          </InstructorView>,
        ),
      ),
    );

    getByText('Instructor Preview 👆');
    getByText('Go to Dashboard');
  });

  it('removes the button when read_only is true', () => {
    mockDecodedJwt = {
      context_id: 'foo+context_id',
      permissions: {
        can_access_dashboard: true,
      },
    };

    const { getByText, queryByText } = render(
      wrapInIntlProvider(
        <InstructorView>
          <div className="some-child" />
        </InstructorView>,
      ),
    );

    getByText(
      'This video is read-only because it belongs to another course: foo+context_id',
    );
    expect(queryByText('Go to Dashboard')).toBeNull();
  });
});
