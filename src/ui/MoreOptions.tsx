import { BookOpen, X } from '@phosphor-icons/react';
import type { Ref } from 'react';
import type { PresetValue } from '../content/types';
import type { PendulumModel } from '../engine/phenomena/pendulum';
import type { ParamSpec, Params } from '../engine/types';
import { SPEEDS, speedLabel } from './kidLabels';
import { LinearizationToggle } from './LinearizationToggle';
import { ModelSelector } from './ModelSelector';
import { ParamControl } from './ParamControl';
import { CuriousData } from './ResultsPanel';
import { Segmented } from './Segmented';

interface Props {
  open: boolean;
  /** El título recibe el foco al abrir con el botón; es el destino del foco, no un control. */
  titleRef: Ref<HTMLHeadingElement>;
  onClose: () => void;
  model: PendulumModel;
  onModelChange: (model: PendulumModel) => void;
  maxPhi0: number;
  showLinear: boolean;
  onToggleLinear: () => void;
  /** Esquemas de los parámetros que viven aquí (masa y rozamiento). */
  specs: ParamSpec[];
  params: Params;
  presets: Record<string, PresetValue[]>;
  onParamChange: (key: string, value: number) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  results: Record<string, number>;
  /** Recibe el botón que abre la hoja: el foco vuelve a él al cerrarla. */
  onOpenTheory: (opener: HTMLElement) => void;
}

/**
 * Cajón "Más opciones" (solo en Explorar): lo que no hace falta para mirar el péndulo. Empuja el
 * diseño en pantallas anchas (no tapa el péndulo) y es una hoja inferior en el celular. Cerrado queda `inert`: sus
 * controles no reciben foco ni se leen, pero el botón que lo abre puede apuntarle con aria-controls.
 */
export function MoreOptions({
  open,
  titleRef,
  onClose,
  model,
  onModelChange,
  maxPhi0,
  showLinear,
  onToggleLinear,
  specs,
  params,
  presets,
  onParamChange,
  speed,
  onSpeedChange,
  results,
  onOpenTheory,
}: Props) {
  return (
    <aside className="drawer" id="drawer" aria-labelledby="drawer-title" inert={!open}>
      <div className="drawer-in">
        <div className="drawer-head">
          <h2 id="drawer-title" ref={titleRef} tabIndex={-1} className="focus-target">
            Más opciones
          </h2>
          <button type="button" className="btn sec" onClick={onClose}>
            <X className="ic" weight="bold" aria-hidden="true" />
            Cerrar
          </button>
        </div>
        <div className="drawer-body">
          <section className="dsec" aria-labelledby="h-calc">
            <ModelSelector model={model} onChange={onModelChange} maxPhi0={maxPhi0} />
          </section>
          <section className="dsec">
            <LinearizationToggle showLinear={showLinear} onToggle={onToggleLinear} />
            <p className="note">Muestra una curva punteada naranja en la gráfica.</p>
          </section>
          {specs.map((spec) => (
            <section key={spec.key} className="dsec">
              <ParamControl
                spec={spec}
                value={params[spec.key]}
                presets={presets[spec.key]}
                onChange={(value) => onParamChange(spec.key, value)}
              />
            </section>
          ))}
          <section className="dsec" aria-labelledby="h-vel">
            <h3 id="h-vel">Velocidad de la simulación</h3>
            <Segmented
              name="velocidad"
              className="choice"
              labelledBy="h-vel"
              value={String(speed)}
              onChange={(value) => onSpeedChange(Number(value))}
              options={SPEEDS.map((s) => ({ value: String(s), label: speedLabel(s) }))}
            />
          </section>
          <section className="dsec" aria-labelledby="h-cur">
            <h3 id="h-cur">Datos para curiosos</h3>
            <CuriousData results={results} />
          </section>
          <section className="dsec">
            <button type="button" className="btn sec" aria-haspopup="dialog" onClick={(event) => onOpenTheory(event.currentTarget)}>
              <BookOpen className="ic" weight="bold" aria-hidden="true" />
              Teoría
            </button>
          </section>
        </div>
      </div>
    </aside>
  );
}
