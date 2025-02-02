import React, { useEffect, useState } from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import { Link, Redirect } from 'react-router-dom';
import styled from 'styled-components';

import { appData } from '../../data/appData';
import { upload } from '../../data/sideEffects/upload';
import { getResource } from '../../data/stores/generics';
import { useObjectProgress } from '../../data/stores/useObjectProgress';
import { modelName } from '../../types/models';
import { TimedText, timedTextMode, UploadableObject } from '../../types/tracks';
import { Maybe } from '../../utils/types';
import { useAsyncEffect } from '../../utils/useAsyncEffect';
import { DASHBOARD_ROUTE } from '../Dashboard/route';
import { ERROR_COMPONENT_ROUTE } from '../ErrorComponent/route';
import { IframeHeading } from '../Headings';
import { LayoutMainArea } from '../LayoutMainArea';
import { Loader } from '../Loader';
import { UploadField } from '../UploadField';

const messages = defineMessages({
  linkToDashboard: {
    defaultMessage: 'Back to dashboard',
    description: 'Text for the link to the dashboard in the upload form.',
    id: 'components.UploadForm.linkToDashboard',
  },
});

const titleMessages = defineMessages({
  [modelName.VIDEOS]: {
    defaultMessage: 'Create a new video',
    description: 'Title for the video upload form',
    id: 'components.UploadForm.title-videos',
  },
  [modelName.THUMBNAILS]: {
    defaultMessage: 'Upload a new thumbnail',
    description: 'Title for the thumbnail upload form',
    id: 'components.UploadForm.title-thumbnail',
  },
  [modelName.DOCUMENTS]: {
    defaultMessage: 'Upload a new document',
    description: 'Title for the document upload form',
    id: 'components.UploadForm.title-document',
  },
});

const timedtexttrackTitleMessages = defineMessages({
  [timedTextMode.CLOSED_CAPTIONING]: {
    defaultMessage: 'Upload a new closed captions file',
    description: 'Title for the timed text file upload form',
    id: 'components.UploadForm.title-timedtexttracks-cc',
  },
  [timedTextMode.SUBTITLE]: {
    defaultMessage: 'Upload a new subtitles file',
    description: 'Title for the timed text file upload form',
    id: 'components.UploadForm.title-timedtexttracks-st',
  },
  [timedTextMode.TRANSCRIPT]: {
    defaultMessage: 'Upload a new transcript file',
    description: 'Title for the timed text file upload form',
    id: 'components.UploadForm.title-timedtexttracks-ts',
  },
});

const UploadFormContainer = styled(LayoutMainArea)`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const IframeHeadingWithLayout = styled(IframeHeading)`
  flex-grow: 0;
  margin: 0;
  text-align: center;
`;

const UploadFieldContainer = styled.div`
  flex-grow: 1;
  display: flex;
`;

const UploadFormBack = styled.div`
  line-height: 2rem;
  padding: 0.5rem 1rem;
`;

/** Props shape for the UploadForm component. */
interface UploadFormProps {
  objectId: UploadableObject['id'];
  objectType: modelName;
}

export type Status = Maybe<
  'not_found_error' | 'policy_error' | 'uploading' | 'success'
>;

export const UploadForm = ({ objectId, objectType }: UploadFormProps) => {
  const [status, setStatus] = useState(undefined as Status);
  const [object, setObject] = useState(undefined as Maybe<UploadableObject>);

  useAsyncEffect(async () => {
    setObject(await getResource(objectType, objectId));
  }, []);

  const setObjectProgress = useObjectProgress(state => state.setObjectProgress);

  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (status === 'uploading') {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', beforeUnload);

    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  if (object === undefined) {
    return <Loader />;
  }

  switch (status) {
    case 'success':
    case 'uploading':
      return <Redirect push to={DASHBOARD_ROUTE(appData.modelName)} />;

    case 'not_found_error':
      return <Redirect push to={ERROR_COMPONENT_ROUTE('notFound')} />;

    case 'policy_error':
      return <Redirect push to={ERROR_COMPONENT_ROUTE('policy')} />;

    default:
      return (
        <div>
          <UploadFormContainer>
            <IframeHeadingWithLayout>
              <FormattedMessage
                {...(objectType === modelName.TIMEDTEXTTRACKS
                  ? timedtexttrackTitleMessages[(object as TimedText).mode]
                  : titleMessages[objectType])}
              />
            </IframeHeadingWithLayout>
            <UploadFieldContainer>
              <UploadField
                onContentUpdated={upload(
                  setStatus,
                  (progress: number) =>
                    object && setObjectProgress(object.id, progress),
                  objectType,
                  object,
                )}
              />
            </UploadFieldContainer>
          </UploadFormContainer>
          <UploadFormBack>
            <Link to={DASHBOARD_ROUTE(appData.modelName)}>
              <FormattedMessage {...messages.linkToDashboard} />
            </Link>
          </UploadFormBack>
        </div>
      );
  }
};
