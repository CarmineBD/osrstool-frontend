import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
} from "@/components/method-editor/MethodEditorPrimitives";
import type {
  PlayerInfo,
  Variant,
  VariantModifier,
  VariantModifierSelection,
} from "@/lib/api";

const NONE = "__none__";

function getLevel(player: PlayerInfo | null, skillKey?: string): number | undefined {
  if (!player || !skillKey) return undefined;
  const normalizedKey = skillKey.toLowerCase();
  const entry = Object.entries(player.levels).find(
    ([key]) => key.toLowerCase() === normalizedKey,
  );
  return entry?.[1];
}

function ModifierSelect({
  label,
  modifiers,
  value,
  onValueChange,
}: {
  label: string;
  modifiers: VariantModifier[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className={EDITOR_FIELD_LABEL_CLASS}>{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={`${label} modifier`}>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No modifier</SelectItem>
          {modifiers.map((modifier) => (
            <SelectItem key={modifier.id ?? modifier.name} value={modifier.id ?? modifier.name}>
              {modifier.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function VariantModifierControls({
  variant,
  player,
  isAuthenticated,
  isLoading,
  error,
  onSelectionChange,
}: {
  variant: Variant;
  player: PlayerInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  onSelectionChange: (selection?: VariantModifierSelection) => void;
}) {
  const modifiers = useMemo(() => variant.modifiers ?? [], [variant.modifiers]);
  const locations = useMemo(
    () => modifiers.filter((modifier) => modifier.type === "location"),
    [modifiers],
  );
  const equipment = useMemo(
    () => modifiers.filter((modifier) => modifier.type === "equipment"),
    [modifiers],
  );
  const skills = useMemo(
    () => modifiers.filter((modifier) => modifier.type === "skill_level"),
    [modifiers],
  );
  const [locationId, setLocationId] = useState(NONE);
  const [equipmentId, setEquipmentId] = useState(NONE);
  const [skillId, setSkillId] = useState(NONE);
  const [useFetchedLevel, setUseFetchedLevel] = useState(Boolean(player));
  const [manualLevel, setManualLevel] = useState("1");

  useEffect(() => {
    setLocationId(NONE);
    setEquipmentId(NONE);
    setSkillId(NONE);
    setUseFetchedLevel(Boolean(player));
    setManualLevel("1");
  }, [player, variant.id]);

  const selectedLocation = locations.find(
    (modifier) => (modifier.id ?? modifier.name) === locationId,
  );
  const selectedEquipment = equipment.find(
    (modifier) => (modifier.id ?? modifier.name) === equipmentId,
  );
  const selectedSkill = skills.find(
    (modifier) => (modifier.id ?? modifier.name) === skillId,
  );
  const fetchedLevel = getLevel(player, selectedSkill?.skill?.key);
  const parsedManualLevel = Number(manualLevel);
  const skillLevel = useFetchedLevel ? fetchedLevel : parsedManualLevel;

  useEffect(() => {
    if (!variant.id) return;
    const selections: VariantModifierSelection["modifiers"] = [];
    if (selectedLocation) {
      selections.push({ type: "location", value: selectedLocation.name });
    }
    if (selectedEquipment) {
      selections.push({ type: "equipment", value: selectedEquipment.name });
    }
    if (
      selectedSkill?.skill?.key &&
      typeof skillLevel === "number" &&
      Number.isInteger(skillLevel) &&
      skillLevel >= 1 &&
      skillLevel <= 99
    ) {
      selections.push({
        type: "skill_level",
        skill: selectedSkill.skill.key,
        value: skillLevel,
      });
    }
    onSelectionChange(
      selections.length ? { variant_id: variant.id, modifiers: selections } : undefined,
    );
  }, [
    onSelectionChange,
    selectedEquipment,
    selectedLocation,
    selectedSkill,
    skillLevel,
    variant.id,
  ]);

  if (!modifiers.length) return null;

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
        <p className={EDITOR_BODY_TEXT_CLASS}>Sign in to apply this variant&apos;s modifiers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
      <div className="space-y-1">
        <p className={EDITOR_FIELD_LABEL_CLASS}>Modifiers</p>
        <p className={EDITOR_BODY_TEXT_CLASS}>Choose the conditions that apply to this variant.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {locations.length ? (
          <ModifierSelect
            label="Location"
            modifiers={locations}
            value={locationId}
            onValueChange={setLocationId}
          />
        ) : null}
        {equipment.length ? (
          <ModifierSelect
            label="Equipment"
            modifiers={equipment}
            value={equipmentId}
            onValueChange={setEquipmentId}
          />
        ) : null}
        {skills.length ? (
          <div className="space-y-3">
            <ModifierSelect
              label="Skill level"
              modifiers={skills}
              value={skillId}
              onValueChange={setSkillId}
            />
            {selectedSkill ? (
              <div className="space-y-3 rounded-md border border-border/60 bg-background p-3">
                <label className="flex items-center justify-between gap-3">
                  <span className={EDITOR_META_TEXT_CLASS}>Use fetched stats</span>
                  <Switch
                    checked={useFetchedLevel && Boolean(fetchedLevel)}
                    disabled={!fetchedLevel}
                    aria-label="Use fetched stats for modifier level"
                    onCheckedChange={setUseFetchedLevel}
                  />
                </label>
                <div className="space-y-2">
                  <label className={EDITOR_META_TEXT_CLASS} htmlFor={`modifier-level-${variant.id}`}>
                    Simulated level
                  </label>
                  <Input
                    id={`modifier-level-${variant.id}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    step={1}
                    value={useFetchedLevel && fetchedLevel ? String(fetchedLevel) : manualLevel}
                    onChange={(event) => {
                      setManualLevel(event.target.value.replace(/\D/g, "").slice(0, 2));
                      setUseFetchedLevel(false);
                    }}
                  />
                  {useFetchedLevel && fetchedLevel ? (
                    <p className={EDITOR_META_TEXT_CLASS}>
                      Using fetched {selectedSkill.skill?.name ?? selectedSkill.name} level {fetchedLevel}.
                      Turn off the switch to simulate another level.
                    </p>
                  ) : !fetchedLevel ? (
                    <p className={EDITOR_META_TEXT_CLASS}>
                      Fetch your OSRS stats to use this skill level automatically.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {isLoading ? <p className={EDITOR_META_TEXT_CLASS}>Applying modifiers…</p> : null}
      {error ? <p className="text-[13px] font-medium leading-[18px] text-destructive">{error.message}</p> : null}
    </div>
  );
}
