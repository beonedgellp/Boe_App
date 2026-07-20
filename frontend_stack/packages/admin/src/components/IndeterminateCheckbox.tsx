import { useRef, useEffect } from 'react';

function IndeterminateCheckbox({ indeterminate, ...props }: any) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) (ref.current as any).indeterminate = indeterminate;
  }, [indeterminate]);
  return <input type="checkbox" ref={ref} {...props} />;
}

export default IndeterminateCheckbox;
