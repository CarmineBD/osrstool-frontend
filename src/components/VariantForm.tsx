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
import type { SkillOption, Variant } from "../lib/api";
import { IconDotsVertical, IconX, IconChevronDown } from "@tabler/icons-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { IoItemsField } from "@/components/IoItemsField";
import { XpSkillsField } from "@/components/XpSkillsField";

interface VariantFormProps {
  onRemove: () => void;
  variant: Variant;
  skillOptions: SkillOption[];
  onChange?: (updated: Variant) => void;
  onDuplicate?: () => void;
  isLabelDuplicate?: boolean;
}

export function VariantForm({
  onRemove,
  variant,
  skillOptions,
  onChange,
  onDuplicate,
  isLabelDuplicate,
}: VariantFormProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string>(variant.label);
  const [description, setDescription] = useState<string>(variant.description ?? "");
  const [wilderness, setWilderness] = useState<boolean>(variant.wilderness ?? false);
  const [afkiness, setAfkiness] = useState<number | undefined>(variant.afkiness);
  const [clickIntensity, setClickIntensity] = useState<number | undefined>(
    variant.clickIntensity ?? variant.actionsPerHour
  );
  const [xpHour, setXpHour] = useState<NonNullable<Variant["xpHour"]>>(
    variant.xpHour ?? []
  );
  const [inputs, setInputs] = useState<Variant["inputs"]>(variant.inputs ?? []);
  const [outputs, setOutputs] = useState<Variant["outputs"]>(variant.outputs ?? []);
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
    setClickIntensity(variant.clickIntensity ?? variant.actionsPerHour);
    setXpHour(variant.xpHour ?? []);
    setInputs(variant.inputs ?? []);
    setOutputs(variant.outputs ?? []);
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
              <Button type="button" variant="ghost" size="icon">
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
                <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                <AlertDialogAction type="button" onClick={onRemove}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon">
                <IconDotsVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Delete</DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
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
              className={cn(
                isLabelDuplicate && "border-red-500 focus-visible:ring-red-500"
              )}
              onChange={(e) => {
                const next = e.target.value;
                setLabel(next);
                onChange?.({ ...variant, label: next });
              }}
            />
            {isLabelDuplicate && (
              <p className="mt-1 text-sm text-red-500">
                Este nombre ya existe en otro variant.
              </p>
            )}
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
                Clicks per hour (clickIntensity)
              </label>
              <Input
                type="number"
                value={clickIntensity ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const num = v === "" ? undefined : Number(v);
                  setClickIntensity(num);
                  onChange?.({ ...variant, clickIntensity: num });
                }}
              />
            </div>
          </div>
          <XpSkillsField
            label="XP per hour"
            skills={skillOptions}
            entries={xpHour}
            onChange={(next) => {
              setXpHour(next);
              onChange?.({ ...variant, xpHour: next });
            }}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <IoItemsField
              label="Inputs"
              items={inputs}
              onChange={(next) => {
                setInputs(next);
                onChange?.({ ...variant, inputs: next });
              }}
            />
            <IoItemsField
              label="Outputs"
              items={outputs}
              onChange={(next) => {
                setOutputs(next);
                onChange?.({ ...variant, outputs: next });
              }}
            />
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
                  } catch {
                    return;
                  }
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
                  } catch {
                    return;
                  }
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
