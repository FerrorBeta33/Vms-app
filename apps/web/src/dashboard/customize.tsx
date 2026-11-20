import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button, Select, Dialog } from '../components/ui';
import { widgetKeys, widgetNames, type Widget, type useLayout } from './layout';
export function CustomizeBar({ layout }: { layout: ReturnType<typeof useLayout> }) {
  return (
    <Dialog title="Customize workspace" drawer onClose={layout.cancel}>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Reorder, resize or hide secondary widgets. Drag a handle or use the move buttons. Changes
        are a draft until you save; primary metrics and Action Center stay available.
      </p>
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap gap-2 border-b border-border bg-card pb-4">
        <Button secondary onClick={layout.reset}>
          Reset defaults
        </Button>
        <Button secondary onClick={layout.cancel}>
          Cancel
        </Button>
        <Button onClick={layout.save}>Save layout</Button>
      </div>
      <ol className="space-y-4">
        {layout.widgets.map((widget, index) => (
          <li
            key={widget.key}
            className="rounded-container border border-border"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const key = event.dataTransfer.getData('text/plain');
              if (!widgetKeys.includes(key as Widget['key'])) return;
              const from = layout.draft.findIndex((item) => item.key === key);
              layout.move(key as Widget['key'], index - from);
            }}
          >
            <h3 className="px-3 pt-3 text-sm font-semibold">{widgetNames[widget.key]}</h3>
            <WidgetControls
              widget={widget}
              index={index}
              total={layout.widgets.length}
              layout={layout}
            />
          </li>
        ))}
      </ol>
      {layout.error && (
        <p role="alert" className="text-sm text-destructive">
          {layout.error}
        </p>
      )}
    </Dialog>
  );
}
function WidgetControls({
  widget,
  index,
  total,
  layout,
}: {
  widget: Widget;
  index: number;
  total: number;
  layout: ReturnType<typeof useLayout>;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 p-3">
      <button
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', widget.key);
          event.dataTransfer.effectAllowed = 'move';
        }}
        className="flex min-h-11 items-center gap-1 rounded-control border border-border bg-card px-3 text-xs"
        aria-label={`Drag ${widget.key} widget`}
      >
        <GripVertical size={16} />
        Reorder
      </button>
      <Button
        secondary
        disabled={index === 0}
        aria-label={`Move ${widget.key} up`}
        onClick={() => layout.move(widget.key, -1)}
      >
        <ArrowUp size={14} />
      </Button>
      <Button
        secondary
        disabled={index === total - 1}
        aria-label={`Move ${widget.key} down`}
        onClick={() => layout.move(widget.key, 1)}
      >
        <ArrowDown size={14} />
      </Button>
      <Select
        label={`${widgetNames[widget.key]} width`}
        value={widget.size}
        onChange={(event) =>
          layout.change(widget.key, { size: event.target.value as Widget['size'] })
        }
      >
        {(
          [
            ['small', 'Compact'],
            ['medium', 'Wide'],
            ['large', 'Full width'],
          ] as const
        ).map(([size, label]) => (
          <option key={size} value={size}>
            {label}
          </option>
        ))}
      </Select>
      <label className="flex min-h-11 items-center gap-2 px-2 text-xs">
        <input
          type="checkbox"
          aria-label={`${widgetNames[widget.key]} visible`}
          checked={widget.visible}
          onChange={(event) => layout.change(widget.key, { visible: event.target.checked })}
        />
        Visible
      </label>
    </div>
  );
}
