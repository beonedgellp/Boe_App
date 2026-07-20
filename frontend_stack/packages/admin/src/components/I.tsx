const I = ({ icon: Icon, size = 16, ...rest }: any) => {
  const labelled = Boolean(rest['aria-label'] || rest['aria-labelledby'] || rest.title);
  return (
    <Icon
      size={size}
      strokeWidth={1.5}
      aria-hidden={rest['aria-hidden'] ?? (labelled ? undefined : 'true')}
      focusable="false"
      {...rest}
    />
  );
};

export default I;
