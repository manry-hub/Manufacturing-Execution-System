import React from 'react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { ProductionOrdersView } from '../components/production/ProductionOrdersView.js';

export const ProductionOrdersPage: React.FC = () => {
  const {
    orders,
    runs,
    handleCreateOrder,
    handleReleaseOrder,
    handlePauseRun,
    handleCompleteRun,
    handleRecordScrap,
    refreshData,
  } = useShopfloor();

  return (
    <ProductionOrdersView
      orders={orders}
      runs={runs}
      onCreateOrder={handleCreateOrder}
      onReleaseOrder={handleReleaseOrder}
      onPauseRun={handlePauseRun}
      onCompleteRun={handleCompleteRun}
      onRecordScrap={handleRecordScrap}
      onRefresh={refreshData}
    />
  );
};

export default ProductionOrdersPage;
