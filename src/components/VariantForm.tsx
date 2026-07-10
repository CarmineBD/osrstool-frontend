import { useEffect, useState } from "react";
import {
  IconChevronDown,
  IconDotsVertical,
  IconX,
} from "@tabler/icons-react";
import type {
  AchievementDiaryOption,
  QuestOption,
  SkillOption,
  Variant,
} from "@/lib/api";
import { ItemIconField } from "@/components/ItemIconField";
import { IoItemsField } from "@/components/IoItemsField";
import { RequirementsRecommendationsField } from "@/components/RequirementsRecommendationsField";
import { XpSkillsField } from "@/components/XpSkillsField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface VariantFormProps {
  index: number;
  onRemove: () => void;
  variant: Variant;
  skillOptions: SkillOption[];
  questOptions: QuestOption[];
  achievementDiaryOptions: AchievementDiaryOption[];
  onChange?: (updated: Variant) => void;
  onDuplicate?: () => void;
  isLabelDuplicate?: boolean;
  showValidationErrors?: boolean;
}

function normalizeIconId(value: number | null | undefined): number | undefined {
  return Number.isInteger(value) && (value as number) > 0
    ? (value as number)
    : undefined;
}

export function VariantForm({
  index,
  onRemove,
  variant,
  skillOptions,
  questOptions,
  achievementDiaryOptions,
  onChange,
  onDuplicate,
  isLabelDuplicate,
  showValidationErrors,
}: VariantFormProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string>(variant.label);
  const [iconId, setIconId] = useState<number | undefined>(
    normalizeIconId(variant.icon_id),
  );
  const [description, setDescription] = useState<string>(
    variant.description ?? "",
  );
  const [members, setMembers] = useState<boolean>(variant.members ?? false);
  const [wilderness, setWilderness] = useState<boolean>(
    variant.wilderness ?? false,
  );
  const [afkiness, setAfkiness] = useState<number | undefined>(variant.afkiness);
  const [clickIntensity, setClickIntensity] = useState<number | undefined>(
    variant.clickIntensity ?? variant.actionsPerHour,
  );
  const [xpHour, setXpHour] = useState<NonNullable<Variant["xpHour"]>>(
    variant.xpHour ?? [],
  );
  const [inputs, setInputs] = useState<Variant["inputs"]>(variant.inputs ?? []);
  const [outputs, setOutputs] = useState<Variant["outputs"]>(variant.outputs ?? []);

  useEffect(() => {
    setLabel(variant.label);
    setIconId(normalizeIconId(variant.icon_id));
    setDescription(variant.description ?? "");
    setMembers(variant.members ?? false);
    setWilderness(variant.wilderness ?? false);
    setAfkiness(variant.afkiness);
    setClickIntensity(variant.clickIntensity ?? variant.actionsPerHour);
    setXpHour(variant.xpHour ?? []);
    setInputs(variant.inputs ?? []);
    setOutputs(variant.outputs ?? []);
  }, [variant]);

  const iconError =
    showValidationErrors && !iconId ? "Variant icon is required" : undefined;

  return (
    <div className="mb-4 rounded border">
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
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
                  Are you sure you want to delete this variant?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
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

      {open ? (
        <div className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Label</label>
              <Input
                value={label}
                className={cn(
                  isLabelDuplicate && "border-red-500 focus-visible:ring-red-500",
                )}
                onChange={(event) => {
                  const next = event.target.value;
                  setLabel(next);
                  onChange?.({ ...variant, label: next });
                }}
              />
              {isLabelDuplicate ? (
                <p className="mt-1 text-sm text-red-500">
                  Este nombre ya existe en otro variant.
                </p>
              ) : null}
            </div>

            <ItemIconField
              label="Variant icon"
              value={iconId}
              onChange={(next) => {
                setIconId(next);
                onChange?.({ ...variant, icon_id: next });
              }}
              error={iconError}
              searchAriaLabel={`Variant ${index + 1} icon search`}
              optionsAriaLabel={`Variant ${index + 1} icon search options`}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe this variant"
              className="min-h-[100px]"
              value={description}
              onChange={(event) => {
                const next = event.target.value;
                setDescription(next);
                onChange?.({ ...variant, description: next });
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={members}
                onCheckedChange={(checked) => {
                  setMembers(checked);
                  onChange?.({ ...variant, members: checked });
                }}
              />
              <span className="text-sm">Members</span>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">AFKiness</label>
              <Input
                type="number"
                value={afkiness ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const numericValue =
                    nextValue === "" ? undefined : Number(nextValue);
                  setAfkiness(numericValue);
                  onChange?.({ ...variant, afkiness: numericValue });
                }}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Clicks per hour (clickIntensity)
              </label>
              <Input
                type="number"
                value={clickIntensity ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const numericValue =
                    nextValue === "" ? undefined : Number(nextValue);
                  setClickIntensity(numericValue);
                  onChange?.({ ...variant, clickIntensity: numericValue });
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

          <RequirementsRecommendationsField
            requirements={variant.requirements}
            recommendations={variant.recommendations}
            skillOptions={skillOptions}
            questOptions={questOptions}
            achievementDiaryOptions={achievementDiaryOptions}
            onChange={({ requirements: nextRequirements, recommendations }) => {
              onChange?.({
                ...variant,
                requirements: nextRequirements,
                recommendations,
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default VariantForm;
