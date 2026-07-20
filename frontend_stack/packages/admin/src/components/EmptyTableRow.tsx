function EmptyTableRow({ colSpan, children }: any) {
  return (
    <tr className="adm-empty-row">
      <td colSpan={colSpan}>
        <div className="adm-empty-state">{children}</div>
      </td>
    </tr>
  );
}

export default EmptyTableRow;
