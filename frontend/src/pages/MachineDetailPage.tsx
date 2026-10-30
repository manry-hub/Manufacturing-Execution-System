import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { MachineDetailView } from '../components/machines/detail/MachineDetailView.js';

export const MachineDetailPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();

  const {
    machines,
    runs,
    setSelectedMachineForAndon,
    handleTriggerScenario,
    refreshData,
  } = useShopfloor();

  const selectedMachine =
    machines.find(
      (m) =>
        m.code.toUpperCase() === (code?.toUpperCase() ?? '') ||
        m.id === code,
    ) ?? machines[0];

  const activeRun = runs.find((r) => r.machineId === selectedMachine?.id);

  if (!selectedMachine) {
    return (
      <div className="text-center py-12 text-[#505258]">
        <p className="text-sm font-semibold">No machine data available.</p>
      </div>
    );
  }

  return (
    <MachineDetailView
      machine={selectedMachine}
      allMachines={machines}
      activeRun={activeRun}
      onSelectMachine={(m) => void navigate(`/machines/${m.code}`)}
      onBackToGrid={() => void navigate('/shopfloor')}
      onTriggerAndon={(m) => setSelectedMachineForAndon(m)}
      onTriggerScenario={handleTriggerScenario}
      onRefresh={refreshData}
    />
  );
};

export default MachineDetailPage;
