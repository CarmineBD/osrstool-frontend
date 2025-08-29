import { useState } from "react";
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
import {
  IconDotsVertical,
  IconX,
  IconChevronDown,
} from "@tabler/icons-react";

interface VariantFormProps {
  onRemove: () => void;
}

export function VariantForm({ onRemove }: VariantFormProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border rounded mb-4">
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setOpen(!open)}
        >
          <span>Label</span>
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
              <DropdownMenuItem>Option 1</DropdownMenuItem>
              <DropdownMenuItem>Option 2</DropdownMenuItem>
              <DropdownMenuItem>Option 3</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {open && (
        <div className="p-4 space-y-4">
          <div className="border border-dashed rounded h-24 bg-gray-100" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-dashed rounded h-24 bg-gray-100" />
            <div className="border border-dashed rounded h-24 bg-gray-100" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-dashed rounded h-24 bg-gray-100" />
            <div className="border border-dashed rounded h-24 bg-gray-100" />
          </div>
          <h4 className="font-medium">Requirements and recommendations</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-dashed rounded h-24 bg-gray-100" />
            <div className="border border-dashed rounded h-24 bg-gray-100" />
            <div className="border border-dashed rounded h-24 bg-gray-100" />
            <div className="border border-dashed rounded h-24 bg-gray-100" />
          </div>
        </div>
      )}
    </div>
  );
}

export default VariantForm;

