import { useMemo, useState } from "react";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_FIELD_LABEL_CLASS,
  EDITOR_META_TEXT_CLASS,
  PixelArtIcon,
} from "@/components/method-editor/MethodEditorPrimitives";
import type { SkillOption, Variant } from "@/lib/api";
import { getUrlByType } from "@/lib/utils";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type XpHourEntry = NonNullable<Variant["xpHour"]>[number];

interface XpSkillsFieldProps {
  label?: string;
  skills: SkillOption[];
  entries: XpHourEntry[];
  onChange: (next: XpHourEntry[]) => void;
  placeholder?: string;
}

const MAX_SKILL_RESULTS = 25;
const MAX_XP_DIGITS = 8;

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDigits(value: string, maxDigits: number): string {
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

export function XpSkillsField({
  label,
  skills,
  entries,
  onChange,
  placeholder,
}: XpSkillsFieldProps) {
  const [query, setQuery] = useState("");

  const uniqueSkills = useMemo(() => {
    const map = new Map<string, SkillOption>();
    for (const skill of skills) {
      const key = normalizeSkill(skill.name);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          ...skill,
          name: skill.name.trim(),
          label: skill.label?.trim() || skill.name.trim(),
          value: skill.value?.trim() || key,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [skills]);

  const skillLookup = useMemo(() => {
    return new Map(
      uniqueSkills.map((skill) => [normalizeSkill(skill.name), skill] as const)
    );
  }, [uniqueSkills]);

  const filteredSkills = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const pool = trimmed
      ? uniqueSkills.filter((skill) =>
          skill.name.toLowerCase().includes(trimmed)
        )
      : uniqueSkills;
    return pool.slice(0, MAX_SKILL_RESULTS);
  }, [query, uniqueSkills]);

  const hasSkill = (skillName: string) => {
    const target = normalizeSkill(skillName);
    return entries.some((entry) => normalizeSkill(entry.skill) === target);
  };

  const handleAddSkill = (skill: SkillOption | null) => {
    if (!skill) return;
    const normalized = normalizeSkill(skill.name);
    if (!normalized || hasSkill(normalized)) {
      setQuery("");
      return;
    }
    onChange([...entries, { skill: normalized, experience: 0 }]);
    setQuery("");
  };

  const handleRemoveSkill = (skillName: string) => {
    const target = normalizeSkill(skillName);
    onChange(entries.filter((entry) => normalizeSkill(entry.skill) !== target));
  };

  const handleExperienceChange = (skillName: string, value: string) => {
    const normalizedValue = normalizeDigits(value, MAX_XP_DIGITS);
    const nextExperience = normalizedValue === "" ? 0 : Number(normalizedValue);
    if (!Number.isFinite(nextExperience)) return;
    const target = normalizeSkill(skillName);
    onChange(
      entries.map((entry) =>
        normalizeSkill(entry.skill) === target
          ? { ...entry, experience: Math.max(0, nextExperience) }
          : entry
      )
    );
  };

  const emptyMessage = query.trim() ? "No results found" : "Type to search";

  return (
    <div>
      {label ? <label className={EDITOR_FIELD_LABEL_CLASS}>{label}</label> : null}
      <Combobox<SkillOption>
        inputValue={query}
        onInputValueChange={(value) => setQuery(value)}
        onValueChange={(value) => handleAddSkill(value)}
        filter={null}
        itemToStringLabel={(item) => item.name}
        itemToStringValue={(item) => item.value}
        isItemEqualToValue={(a, b) => {
          if (!a || !b) return false;
          return normalizeSkill(a.name) === normalizeSkill(b.name);
        }}
      >
        <ComboboxInput
          className="w-full"
          placeholder={placeholder ?? "Search for a skill..."}
          showClear={query.trim().length > 0}
        />
        <ComboboxContent>
          <ComboboxList>
            {filteredSkills.map((skill) => {
              const isAdded = hasSkill(skill.name);
              return (
                <ComboboxItem key={skill.value} value={skill} disabled={isAdded}>
                  <div className="flex items-center gap-2">
                    <PixelArtIcon
                      src={getUrlByType(skill.name)}
                      alt={`${skill.name}_icon`}
                      size="sm"
                    />
                    <span>{skill.name}</span>
                    {isAdded ? (
                      <span className={EDITOR_META_TEXT_CLASS}>Added</span>
                    ) : null}
                  </div>
                </ComboboxItem>
              );
            })}
          </ComboboxList>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      {entries.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {entries.map((entry) => {
            const normalizedEntrySkill = normalizeSkill(entry.skill);
            const skill = skillLookup.get(normalizedEntrySkill);
            const skillName = skill?.name ?? entry.skill;
            const iconUrl = getUrlByType(skillName);
            return (
              <div
                key={normalizedEntrySkill}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1.5"
              >
                <PixelArtIcon
                  src={iconUrl}
                  alt=""
                  size="sm"
                  className="h-6 w-6"
                  title={skillName}
                />

                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={MAX_XP_DIGITS}
                  value={entry.experience > 0 ? String(entry.experience) : ""}
                  aria-label={`XP per hour for ${skillName}`}
                  placeholder="XP"
                  onChange={(event) =>
                    handleExperienceChange(entry.skill, event.target.value)
                  }
                  className="h-8 w-24 rounded-full border-border/60 bg-background px-3 text-sm"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="h-6 w-6 rounded-full"
                  aria-label={`Remove ${skillName}`}
                  onClick={() => handleRemoveSkill(entry.skill)}
                >
                  <IconX size={14} />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={cn("mt-3", EDITOR_BODY_TEXT_CLASS)}>No skills added yet.</p>
      )}
    </div>
  );
}

export default XpSkillsField;
