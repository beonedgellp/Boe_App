import { useRef, useEffect } from 'react';

function IndeterminateCheckbox({ indeterminate, ...props }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input type="checkbox" ref={ref} {...props} />;
}

export default IndeterminateCheckbox;
