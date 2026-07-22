import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getSetting } from '@/db/repos/settings';

export default function Index() {
  const [target, setTarget] = useState<'/onboarding' | '/(tabs)/dashboard' | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const done = await getSetting('onboarded');
      if (live) setTarget(done === '1' ? '/(tabs)/dashboard' : '/onboarding');
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!target) return null;
  return <Redirect href={target} />;
}
