import React from 'react';
// Use dynamic require to avoid TS type errors if symbols are missing in typings
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RN: any = require('react-native');
const Platform = RN?.Platform ?? {};
const RN_TVEventHandler = RN?.TVEventHandler;

export const isTV = Platform?.isTV === true;

export type TVEvent = {
  eventType:
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'select'
    | 'playPause'
    | 'rewind'
    | 'fastForward'
    | 'menu'
    | 'back';
};

// Compatibility hook: uses TVEventHandler class (works across RN versions)
export function useGlobalTVKeys(handler: (evt: TVEvent) => void) {
  React.useEffect(() => {
    if (!isTV || !RN_TVEventHandler) return;
    const tv = new RN_TVEventHandler();
    tv.enable(null, (_cmp: any, evt: any) => {
      if (evt && evt.eventType) handler(evt as TVEvent);
    });
    return () => {
      try { tv.disable(); } catch {}
    };
  }, [handler]);
}
