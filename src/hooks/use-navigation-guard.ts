import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Blocks React Router in-app navigation and browser close/refresh when there
 * are unsaved changes. Returns state + callbacks for driving a confirmation
 * dialog.
 *
 * Usage:
 *   const { showDialog, confirmNavigation, cancelNavigation } =
 *     useNavigationGuard(hasChanges);
 *
 *   // render <UnsavedChangesDialog> with those props
 */
export function useNavigationGuard(isDirty: boolean) {
  /* useBlocker – intercepts React Router <Link> / navigate() calls */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  /* beforeunload – browser close / page refresh */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const showDialog = blocker.state === 'blocked';

  /** User confirmed "leave without saving" */
  const confirmNavigation = () => {
    if (blocker.state === 'blocked') blocker.proceed();
  };

  /** User chose to stay on the page */
  const cancelNavigation = () => {
    if (blocker.state === 'blocked') blocker.reset();
  };

  return { showDialog, confirmNavigation, cancelNavigation };
}
