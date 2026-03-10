import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Badge } from "@/components/ui/Badge";

export interface TopicPlannerDraft {
  client_id: string;
  concept_id?: string;
  name: string;
  description: string;
  pass_percentage: number;
  is_existing: boolean;
}

interface AdminTopicPlannerProps {
  items: TopicPlannerDraft[];
  disabled?: boolean;
  publishedMode?: boolean;
  onChange: (items: TopicPlannerDraft[]) => void;
  onAddTopic: () => void;
  onRemoveTopic: (clientId: string) => void;
}

interface TopicPlannerRowProps {
  item: TopicPlannerDraft;
  index: number;
  disabled: boolean;
  dragDisabled: boolean;
  selected: boolean;
  onSelect: () => void;
}

const getTopicLabel = (item: TopicPlannerDraft, index: number) =>
  item.name.trim() || `Untitled Topic ${index + 1}`;

const getTopicDescription = (item: TopicPlannerDraft) =>
  item.description.trim() || "Add a short description so admins can identify this topic faster.";

const handleKeyboardSelect = (
  event: React.KeyboardEvent<HTMLDivElement>,
  onSelect: () => void
) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect();
  }
};

const SortableTopicPlannerRow: React.FC<TopicPlannerRowProps> = ({
  item,
  index,
  disabled,
  dragDisabled,
  selected,
  onSelect
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: item.client_id,
    disabled: dragDisabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      className={`topic-planner-row ${selected ? "selected" : ""} ${isDragging ? "dragging" : ""}`}
    >
      <div
        className="topic-planner-select"
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={onSelect}
        onKeyDown={(event) => handleKeyboardSelect(event, onSelect)}
        aria-label={`Select Topic ${index + 1}: ${getTopicLabel(item, index)}`}
      >
        <div className="topic-planner-position">
          <span>#{index + 1}</span>
        </div>
        <div className="topic-planner-summary">
          <div className="topic-planner-summary-head">
            <strong>{getTopicLabel(item, index)}</strong>
            <Badge variant="info">Pass {item.pass_percentage}%</Badge>
          </div>
          <p className="muted">{getTopicDescription(item)}</p>
        </div>
      </div>

      <div className="topic-planner-row-actions">
        {selected ? <Badge variant="success">Editing</Badge> : null}
        <Badge variant={item.is_existing ? "neutral" : "info"}>
          {item.is_existing ? "Saved" : "New"}
        </Badge>
        <button
          type="button"
          className="drag-handle compact"
          aria-label={`Drag to move Topic ${index + 1}`}
          disabled={dragDisabled}
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true">|||</span>
        </button>
      </div>
    </div>
  );
};

export const AdminTopicPlanner: React.FC<AdminTopicPlannerProps> = ({
  items,
  disabled = false,
  publishedMode = false,
  onChange,
  onAddTopic,
  onRemoveTopic
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.client_id ?? null);
  const previousCountRef = useRef(items.length);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      previousCountRef.current = 0;
      return;
    }

    const selectedStillExists = selectedId && items.some((item) => item.client_id === selectedId);
    if (!selectedStillExists) {
      setSelectedId(items[0].client_id);
      previousCountRef.current = items.length;
      return;
    }

    if (items.length > previousCountRef.current) {
      setSelectedId(items[items.length - 1].client_id);
    }
    previousCountRef.current = items.length;
  }, [items, selectedId]);

  const activeItem = useMemo(
    () => items.find((item) => item.client_id === activeId) ?? null,
    [activeId, items]
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.client_id === selectedId) ?? items[0] ?? null,
    [items, selectedId]
  );

  const selectedIndex = useMemo(
    () => items.findIndex((item) => item.client_id === selectedItem?.client_id),
    [items, selectedItem]
  );

  const updateSelectedItem = (patch: Partial<TopicPlannerDraft>) => {
    if (!selectedItem) {
      return;
    }
    onChange(
      items.map((item) =>
        item.client_id === selectedItem.client_id ? { ...item, ...patch } : item
      )
    );
  };

  const selectedItemLocked = Boolean(publishedMode && selectedItem?.is_existing);
  const canAddTopic = !disabled;
  const canSaveEdits = !disabled && !selectedItemLocked;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.client_id === active.id);
    const newIndex = items.findIndex((item) => item.client_id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    if (publishedMode) {
      const activeTopic = items[oldIndex];
      const overTopic = items[newIndex];
      if (activeTopic?.is_existing || overTopic?.is_existing) {
        return;
      }
    }
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div className="topic-planner">
      <div className="topic-planner-shell">
        <div className="topic-planner-list-column">
          <div className="topic-planner-list-header">
            <div>
              <h5>Learning Order</h5>
            </div>
            <div className="inline-actions">
              <Badge variant="info">{items.length} topics</Badge>
              <Button variant="secondary" onClick={onAddTopic} disabled={!canAddTopic}>
                Add Topic
              </Button>
            </div>
          </div>

          {publishedMode ? (
            <p className="muted">
              This syllabus is live. Existing topics remain read-only, and any new topics are added
              after the current sequence.
            </p>
          ) : null}

          {disabled && !publishedMode ? (
            <p className="muted">
              Topic plan editing is temporarily paused while another admin action is running.
            </p>
          ) : null}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setActiveId(String(event.active.id))}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.client_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="topic-planner-list">
                {items.map((item, index) => (
                  <SortableTopicPlannerRow
                    key={item.client_id}
                    item={item}
                    index={index}
                    disabled={disabled}
                    dragDisabled={disabled || (publishedMode && item.is_existing)}
                    selected={item.client_id === selectedItem?.client_id}
                    onSelect={() => setSelectedId(item.client_id)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeItem ? (
                <div className="topic-planner-row topic-planner-row overlay">
                  <div className="topic-planner-select">
                    <div className="topic-planner-position">
                      <span>#{items.findIndex((item) => item.client_id === activeItem.client_id) + 1}</span>
                    </div>
                    <div className="topic-planner-summary">
                      <div className="topic-planner-summary-head">
                        <strong>
                          {getTopicLabel(
                            activeItem,
                            items.findIndex((item) => item.client_id === activeItem.client_id)
                          )}
                        </strong>
                        <Badge variant="info">Pass {activeItem.pass_percentage}%</Badge>
                      </div>
                      <p className="muted">{getTopicDescription(activeItem)}</p>
                    </div>
                  </div>
                  <div className="topic-planner-row-actions">
                    <Badge variant={activeItem.is_existing ? "neutral" : "info"}>
                      {activeItem.is_existing ? "Saved" : "New"}
                    </Badge>
                    <div className="drag-handle compact static">
                      <span aria-hidden="true">|||</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

        </div>

        <div className="topic-planner-editor-column">
          {selectedItem ? (
            <Card className="subtle topic-planner-editor">
              <div className="topic-planner-editor-header">
                <div>
                  <p className="eyebrow">Selected Topic</p>
                  <h5>
                    Topic {selectedIndex + 1}: {getTopicLabel(selectedItem, Math.max(selectedIndex, 0))}
                  </h5>
                  <p className="muted">
                    Edit the details for the selected topic without changing the compact ordering
                    view.
                  </p>
                </div>
                <div className="inline-actions">
                  <Badge variant="info">Pass {selectedItem.pass_percentage}%</Badge>
                  <Badge variant={selectedItem.is_existing ? "neutral" : "success"}>
                    {selectedItem.is_existing ? "Saved Topic" : "New Topic"}
                  </Badge>
                </div>
              </div>

              <div className="topic-planner-editor-grid">
                <Input
                  label="Topic Name"
                  value={selectedItem.name}
                  onChange={(event) => updateSelectedItem({ name: event.target.value })}
                  required
                  disabled={!canSaveEdits}
                />
                <Input
                  label="Pass Percentage"
                  type="number"
                  min={1}
                  max={100}
                  value={String(selectedItem.pass_percentage)}
                  onChange={(event) =>
                    updateSelectedItem({
                      pass_percentage: Number(event.target.value || 70)
                    })
                  }
                  required
                  disabled={!canSaveEdits}
                />
              </div>

              <TextArea
                label="Description"
                value={selectedItem.description}
                onChange={(event) => updateSelectedItem({ description: event.target.value })}
                rows={6}
                disabled={!canSaveEdits}
              />

              <div className="topic-planner-editor-footer">
                <p className="topic-planner-editor-note">
                  {selectedItemLocked
                    ? "This published topic is locked. Add new topics without changing the live syllabus."
                    : "The topic number updates automatically from the order shown on the left."}
                </p>
                {!selectedItem.is_existing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTopic(selectedItem.client_id)}
                    disabled={disabled}
                  >
                    Remove This New Topic
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};
