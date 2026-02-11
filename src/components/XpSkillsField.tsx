import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";

type XpHourEntry = NonNullable<Variant["xpHour"]>[number];

interface XpSkillsFieldProps {
  label: string;
  skills: SkillOption[];
  entries: XpHourEntry[];
  onChange: (next: XpHourEntry[]) => void;
  placeholder?: string;
}

const MAX_SKILL_RESULTS = 25;

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
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
    const nextExperience = value === "" ? 0 : Number(value);
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

  const emptyMessage = query.trim() ? "Sin resultados" : "Escribe para buscar";

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>
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
          placeholder={placeholder ?? "Buscar skill..."}
          showClear={query.trim().length > 0}
        />
        <ComboboxContent>
          <ComboboxList>
            {filteredSkills.map((skill) => {
              const isAdded = hasSkill(skill.name);
              return (
                <ComboboxItem key={skill.value} value={skill} disabled={isAdded}>
                  <div className="flex items-center gap-2">
                    {getUrlByType(skill.name) ? (
                      <img
                        src={getUrlByType(skill.name) ?? ""}
                        alt={`${skill.name}_icon`}
                        className="h-5 w-5 object-contain"
                      />
                    ) : null}
                    <span>{skill.name}</span>
                    {isAdded ? (
                      <span className="text-xs text-muted-foreground">
                        Agregado
                      </span>
                    ) : null}
                  </div>
                </ComboboxItem>
              );
            })}
          </ComboboxList>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>

      <Table className="rounded-md border">
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead className="w-[160px]">XP/hr</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground text-sm">
                No hay skills agregadas.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={normalizeSkill(entry.skill)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getUrlByType(entry.skill) ? (
                      <img
                        src={getUrlByType(entry.skill) ?? ""}
                        alt={`${entry.skill}_icon`}
                        className="h-6 w-6 object-contain"
                      />
                    ) : null}
                    <span>{entry.skill}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={entry.experience}
                    onChange={(e) =>
                      handleExperienceChange(entry.skill, e.target.value)
                    }
                    className="w-28"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove skill"
                    onClick={() => handleRemoveSkill(entry.skill)}
                  >
                    <IconX size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default XpSkillsField;
