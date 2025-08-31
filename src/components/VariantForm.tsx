import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Variant } from "../lib/api";
import { IconDotsVertical, IconX, IconChevronDown } from "@tabler/icons-react";
import { Textarea } from "@/components/ui/textarea";

interface VariantFormProps {
  onRemove: () => void;
  variant: Variant;
  onChange?: (updated: Variant) => void;
}

export function VariantForm({ onRemove, variant, onChange }: VariantFormProps) {
  const [open, setOpen] = useState(true);
  const [description, setDescription] = useState<string>(variant.description ?? "");

  useEffect(() => {
    setDescription(variant.description ?? "");
  }, [variant.description]);

  return (
    <div className="border rounded mb-4">
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setOpen(!open)}
        >
          <span>{variant.label}</span>
          <IconChevronDown
            size={16}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <IconX size={16} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Estás seguro que quieres eliminar este variant?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <IconDotsVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Delete</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Move to</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              placeholder="Describe this variant"
              className="min-h-[100px]"
              value={description}
              onChange={(e) => {
                const next = e.target.value;
                setDescription(next);
                onChange?.({ ...variant, description: next });
              }}
              onBlur={() => onChange?.({ ...variant, description })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-dashed rounded h-24 bg-gray-100">
              {Array.isArray(variant.xpHour) && variant.xpHour.length > 0 ? (
                <ul>
                  {variant.xpHour.map((xp, idx) => (
                    <li key={idx}>
                      {xp.skill}: {xp.experience} xp/hr
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No XP data</span>
              )}
            </div>
            <div className="border border-dashed rounded bg-gray-100">
              <div>Wilderness: {variant.wilderness ? "yes" : "no"}</div>
              <div>AFKiness: {variant.afkiness ?? "N/A"}</div>
              <div>Actions per hour: {variant.actionsPerHour}</div>
            </div>
          </div>
          <h4 className="font-medium">Inputs & outputs</h4>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-dashed rounded bg-gray-100">
              {Array.isArray(variant.inputs) && variant.inputs.length > 0 ? (
                <ul>
                  {variant.inputs.map((it, idx) => (
                    <li key={idx}>
                      {it.id}: {it.quantity}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No Inputs</span>
              )}
            </div>
            <div className="border border-dashed rounded bg-gray-100">
              {Array.isArray(variant.outputs) && variant.outputs.length > 0 ? (
                <ul>
                  {variant.outputs.map((it, idx) => (
                    <li key={idx}>
                      {it.id}: {it.quantity}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No Outputs</span>
              )}
            </div>
          </div>
          <h4 className="font-medium">Requirements and recommendations</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-dashed rounded h-24 bg-gray-100">
              {Array.isArray(variant.requirements.items) &&
              variant.requirements.items.length > 0 ? (
                <ul>
                  {variant.requirements.items.map((item, idx) => (
                    <li key={idx}>
                      {item.id}: {item.quantity}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No Items</span>
              )}
            </div>
            <div className="border border-dashed rounded h-24 bg-gray-100">
              {Array.isArray(variant.requirements.levels) &&
              (variant.requirements.levels?.length ?? 0) > 0 ? (
                <ul>
                  {variant.requirements.levels!.map((lvl, idx) => (
                    <li key={idx}>
                      {lvl.skill}: {lvl.level}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No Levels</span>
              )}
            </div>
            <div className="border border-dashed rounded h-24 bg-gray-100">
              {Array.isArray(variant.requirements.quests) &&
              (variant.requirements.quests?.length ?? 0) > 0 ? (
                <ul>
                  {variant.requirements.quests!.map((q, idx) => (
                    <li key={idx}>
                      {q.name} (stage {q.stage})
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No Quests</span>
              )}
            </div>
            <div className="border border-dashed rounded h-24 bg-gray-100">
              {Array.isArray(variant.requirements.achievement_diaries) &&
              (variant.requirements.achievement_diaries?.length ?? 0) > 0 ? (
                <ul>
                  {variant.requirements.achievement_diaries!.map((d, idx) => (
                    <li key={idx}>
                      {d.name} (tier {d.tier})
                    </li>
                  ))}
                </ul>
              ) : (
                <span>No Achievement Diaries</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VariantForm;
