export function useSubscriptionActions(
  _addOne: (data: any) => Promise<any>,
  _update: (id: string, data: any) => Promise<boolean>,
  remove: (id: string) => Promise<boolean>,
  _reload: () => Promise<void>,
  setToast: (msg: string) => void
) {
  const handleDeleteSelected = async (
    selectedIds: Set<string>,
    onSuccess: () => void
  ) => {
    const idsArray = Array.from(selectedIds);
    
    for (const id of idsArray) {
      await remove(id);
    }
    
    setToast(`Deleted ${idsArray.length} payment${idsArray.length > 1 ? 's' : ''}`);
    onSuccess();
  };

  return {
    handleDeleteSelected,
  };
}
