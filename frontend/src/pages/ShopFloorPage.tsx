import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { ShopFloorGrid } from '../components/machines/ShopFloorGrid.js';

export const ShopFloorPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    machines,
    runs,
    simulatorStatus,
    setSelectedMachineForAndon,
    handleStartSimulator,
    handleStopSimulator,
    handleSetSimulatorSpeed,
    handleResetSimulator,
  } = useShopfloor();

  return (
    <ShopFloorGrid
      machines={machines}
      runs={runs}
      simulatorStatus={simulatorStatus}
      onSelectMachine={(m) => void navigate(`/machines/${m.code}`)}
      onTriggerAndon={(m) => setSelectedMachineForAndon(m)}
      onStartSimulator={handleStartSimulator}
      onStopSimulator={handleStopSimulator}
      onSetSimulatorSpeed={handleSetSimulatorSpeed}
      onResetSimulator={handleResetSimulator}
    />
  );
};

export default ShopFloorPage;
