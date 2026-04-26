import { useState, useCallback } from 'react';
import ConfirmDialog from './ConfirmDialog';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
};

type State = ConfirmOptions & { resolve: (v: boolean) => void };

export function useConfirm() {
  const [state, setState] = useState<State | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise(resolve => setState({ ...opts, resolve }));
  }, []);

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  const dialog = (
    <ConfirmDialog
      open={!!state}
      title={state?.title ?? 'Xác nhận'}
      message={state?.message ?? ''}
      confirmLabel={state?.confirmLabel}
      cancelLabel={state?.cancelLabel}
      variant={state?.variant}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, dialog };
}
