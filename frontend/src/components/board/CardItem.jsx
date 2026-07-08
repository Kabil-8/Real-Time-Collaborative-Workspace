import React from "react";
import { Draggable } from "@hello-pangea/dnd";

export default function CardItem({ card, index, onOpen }) {
  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(card)}
          className={`rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-brand-400 cursor-pointer ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-brand-400" : ""
          }`}
        >
          <div className="font-medium text-slate-800">{card.title}</div>
          {card.labels?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {card.labels.map((l) => (
                <span key={l} className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] text-brand-700">{l}</span>
              ))}
            </div>
          )}
          {card.dueDate && (
            <div className="mt-2 text-[11px] text-slate-500">
              Due {new Date(card.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}