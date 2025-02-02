import 'iframe-resizer/js/iframeResizer.contentWindow';

import { Grommet } from 'grommet';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  createIntl,
  createIntlCache,
  IntlShape,
  RawIntlProvider,
} from 'react-intl';

import { AppRoutes } from './components/AppRoutes';
import { getDecodedJwt } from './data/appData';
import { report } from './utils/errors/report';
// Load our style reboot into the DOM
import { GlobalStyles } from './utils/theme/baseStyles';
import { theme } from './utils/theme/theme';

let localeCode: string;
let locale: string;
try {
  locale = localeCode = getDecodedJwt().locale;
  if (localeCode.match(/^.*_.*$/)) {
    localeCode = localeCode.split('_')[0];
  }
} catch (e) {
  localeCode = 'en';
  locale = 'en_US';
}

export let intl: IntlShape;

// Wait for the DOM to load before we scour it for an element that requires React to render
document.addEventListener('DOMContentLoaded', async event => {
  try {
    if (!Intl.PluralRules) {
      await import('intl-pluralrules');
    }

    if (!Intl.RelativeTimeFormat) {
      await import('@formatjs/intl-relativetimeformat');
      // Get `react-intl`/`formatjs` lang specific parameters and data
      await import(
        `@formatjs/intl-relativetimeformat/dist/locale-data/${localeCode}`
      );
    }
  } catch (e) {
    report(e);
  }

  let translatedMessages = null;
  try {
    translatedMessages = await import(`./translations/${locale}.json`);
  } catch (e) {}

  const cache = createIntlCache();
  intl = createIntl(
    {
      locale: localeCode,
      messages: translatedMessages,
    },
    cache,
  );

  // Render our actual component tree
  ReactDOM.render(
    <RawIntlProvider value={intl}>
      <Grommet theme={theme}>
        <AppRoutes />
        <GlobalStyles />
      </Grommet>
    </RawIntlProvider>,
    document.querySelector('#marsha-frontend-root'),
  );
});
