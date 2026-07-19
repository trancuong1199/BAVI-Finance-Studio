import { LiFiWidget } from '@lifi/widget';
import type { WidgetConfig } from '@lifi/widget';

export const SwapWidget = () => {
  const widgetConfig: WidgetConfig = {
    theme: {
      palette: {
        mode: 'dark',
        primary: { main: '#3b82f6' },
        secondary: { main: '#8b5cf6' },
        background: { paper: '#12131c', default: '#0a0b10' },
      },
      shape: {
        borderRadius: 16,
        borderRadiusSecondary: 12,
      },
    },
    integrator: 'BAVI-Swap-Demo',
  };

  return (
    <div className="widget-container glass-panel animate-fade-in delay-100">
      <div className="widget-wrapper">
        <LiFiWidget integrator="BAVI-Swap-Demo" config={widgetConfig} />
      </div>
    </div>
  );
};
