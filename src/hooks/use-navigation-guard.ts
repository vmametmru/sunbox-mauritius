import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Intercepts in-app hash navigation and browser close/refresh when there are
 * unsaved changes. Returns state + callbacks for driving a confirmation dialog.
 *
 * Usage:
 *   const { showDialog, confirmNavigation, cancelNavigation } =
 *     useNavigationGuard(hasChanges);
 *
 *   // render <UnsavedChangesDialog> with those props
 */
export function useNavigationGuard(isDirty: boolean) {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  // Flag to let one programmatic navigation bypass the guard
  const bypassRef = useRef(false);

  /* beforeunload – browser close / page refresh */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /* hashchange – sidebar / menu navigation (HashRouter) */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: HashChangeEvent) => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }
      // Extract path from the new hash (e.g. "#/admin/boq" → "/admin/boq")
      const newPath = new URL(e.newURL).hash.slice(1) || '/';
      // Immediately restore the old URL so React Router doesn't change route
      history.replaceState(null, '', new URL(e.oldURL).hash || '#/');
      // Save where the user wanted to go and show the dialog
      setPendingPath(newPath);
      setShowDialog(true);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, [isDirty]);

  /** User confirmed "leave without saving" */
  const confirmNavigation = () => {
    setShowDialog(false);
    if (pendingPath) {
      bypassRef.current = true;
      navigate(pendingPath);
    }
    setPendingPath(null);
  };

  /** User chose to stay on the page */
  const cancelNavigation = () => {
    setShowDialog(false);
    setPendingPath(null);
  };

  return { showDialog, confirmNavigation, cancelNavigation };
}
