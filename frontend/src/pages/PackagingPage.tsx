import React from 'react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { PackagingView } from '../components/packaging/PackagingView.js';

export const PackagingPage: React.FC = () => {
  const { runs } = useShopfloor();
  return <PackagingView runs={runs} />;
};

export default PackagingPage;
