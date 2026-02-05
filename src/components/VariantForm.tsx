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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface VariantFormProps {
  onRemove: () => void;
  variant: Variant;
  onChange?: (updated: Variant) => void;
}

export function VariantForm({ onRemove, variant, onChange }: VariantFormProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string>(variant.label);
  const [description, setDescription] = useState<string>(variant.description ?? "");
  const [wilderness, setWilderness] = useState<boolean>(variant.wilderness ?? false);
  const [afkiness, setAfkiness] = useState<number | undefined>(variant.afkiness);
  const [actionsPerHour, setActionsPerHour] = useState<number | undefined>(
    variant.actionsPerHour
  );
  const [xpHour, setXpHour] = useState<string>(
    JSON.stringify(variant.xpHour ?? [], null, 2)
  );
  const [inputs, setInputs] = useState<string>(
    JSON.stringify(variant.inputs ?? [], null, 2)
  );
  const [outputs, setOutputs] = useState<string>(
    JSON.stringify(variant.outputs ?? [], null, 2)
  );
  const [requirements, setRequirements] = useState<string>(
    JSON.stringify(variant.requirements ?? {}, null, 2)
  );
  const [recommendations, setRecommendations] = useState<string>(
    JSON.stringify(variant.recommendations ?? {}, null, 2)
  );

  useEffect(() => {
    setLabel(variant.label);
    setDescription(variant.description ?? "");
    setWilderness(variant.wilderness ?? false);
    setAfkiness(variant.afkiness);
    setActionsPerHour(variant.actionsPerHour);
    setXpHour(JSON.stringify(variant.xpHour ?? [], null, 2));
    setInputs(JSON.stringify(variant.inputs ?? [], null, 2));
    setOutputs(JSON.stringify(variant.outputs ?? [], null, 2));
    setRequirements(JSON.stringify(variant.requirements ?? {}, null, 2));
    setRecommendations(JSON.stringify(variant.recommendations ?? {}, null, 2));
  }, [variant]);

  return (
    <div className="border rounded mb-4">
      <div className="flex items-center justify-between p-4">
      <button
        type="button"
        className="flex items-center gap-2 flex-1 text-left"
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
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
            <label className="block text-sm font-medium mb-2">Label</label>
            <Input
              value={label}
              onChange={(e) => {
                const next = e.target.value;
                setLabel(next);
                onChange?.({ ...variant, label: next });
              }}
            />
          </div>
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
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={wilderness}
              onCheckedChange={(checked) => {
                setWilderness(checked);
                onChange?.({ ...variant, wilderness: checked });
              }}
            />
            <span className="text-sm">Wilderness</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">AFKiness</label>
              <Input
                type="number"
                value={afkiness ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const num = v === "" ? undefined : Number(v);
                  setAfkiness(num);
                  onChange?.({ ...variant, afkiness: num });
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Clicks per hour
              </label>
              <Input
                type="number"
                value={actionsPerHour ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const num = v === "" ? undefined : Number(v);
                  setActionsPerHour(num);
                  onChange?.({ ...variant, actionsPerHour: num });
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">XP per hour</label>
            <Textarea
              className="min-h-[100px] font-mono"
              value={xpHour}
              onChange={(e) => {
                const next = e.target.value;
                setXpHour(next);
                try {
                  const parsed = JSON.parse(next);
                  onChange?.({ ...variant, xpHour: parsed });
                } catch {}
              }}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Inputs</label>
              <Textarea
                className="min-h-[100px] font-mono"
                value={inputs}
                onChange={(e) => {
                  const next = e.target.value;
                  setInputs(next);
                  try {
                    const parsed = JSON.parse(next);
                    onChange?.({ ...variant, inputs: parsed });
                  } catch {}
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Outputs</label>
              <Textarea
                className="min-h-[100px] font-mono"
                value={outputs}
                onChange={(e) => {
                  const next = e.target.value;
                  setOutputs(next);
                  try {
                    const parsed = JSON.parse(next);
                    onChange?.({ ...variant, outputs: parsed });
                  } catch {}
                }}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Requirements</label>
              <Textarea
                className="min-h-[100px] font-mono"
                value={requirements}
                onChange={(e) => {
                  const next = e.target.value;
                  setRequirements(next);
                  try {
                    const parsed = JSON.parse(next);
                    onChange?.({ ...variant, requirements: parsed });
                  } catch {}
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Recommendations</label>
              <Textarea
                className="min-h-[100px] font-mono"
                value={recommendations}
                onChange={(e) => {
                  const next = e.target.value;
                  setRecommendations(next);
                  try {
                    const parsed = JSON.parse(next);
                    onChange?.({ ...variant, recommendations: parsed });
                  } catch {}
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VariantForm;
