import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

const CardItem = ({ card, index }) => (
  <Draggable draggableId={card._id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`rounded-2xl p-3 mb-3 border border-slate-800 bg-slate-900/80 text-sm text-slate-100
          shadow-sm transition-shadow ${snapshot.isDragging ? "shadow-xl shadow-violet-500/20" : "hover:shadow-lg hover:shadow-black/10"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-left">
            <p className="font-medium text-slate-100 truncate">{card.title}</p>
            {card.description && (
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{card.description}</p>
            )}
          </div>
          <GripVertical size={16} className="text-slate-500" />
        </div>
      </div>
    )}
  </Draggable>
);

export default CardItem;
