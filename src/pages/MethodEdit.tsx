import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VariantForm } from "@/components/VariantForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Props = Record<string, never>;

export function MethodEdit(_props: Props) {
  void _props;
  const [variants, setVariants] = useState<number[]>([0]);

  const addVariant = () => setVariants((v) => [...v, v.length]);
  const removeVariant = (index: number) =>
    setVariants((v) => v.filter((_, i) => i !== index));

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Edit method</h1>

      <section>
        <h2 className="font-semibold mb-2">Method details</h2>
        <div className="flex flex-row gap-4 mb-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input placeholder="Method name" id="name" className="w-full" />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="skilling">skilling</SelectItem>
                  <SelectItem value="collecting">collecting</SelectItem>
                  <SelectItem value="combat">combat</SelectItem>
                  <SelectItem value="processing">processing</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Description</Label>
            <Input placeholder="Method name" id="name" className="p-4" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Variants details</h2>
        {variants.map((_, index) => (
          <VariantForm key={index} onRemove={() => removeVariant(index)} />
        ))}
        <Button onClick={addVariant} variant="outline" className="mt-4 w-full">
          Add variant +
        </Button>
      </section>
    </div>
  );
}

export default MethodEdit;
