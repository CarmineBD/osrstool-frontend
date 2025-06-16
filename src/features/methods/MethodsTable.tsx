import { useMethods } from "./hooks";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  username?: string;
}

export function MethodsTable({ username }: Props) {
  const { data, error, isLoading, isFetching } = useMethods(username);

  if (isLoading) return <Spinner />;
  if (error) return <p className="text-red-500">Error: {`${error}`}</p>;

  return (
    <div className="w-full space-y-2">
      {isFetching && <p className="text-sm text-gray-500">Updating...</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>GP/h</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data!.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.name}</TableCell>
              <TableCell className="font-medium">
                {m.gpPerHour.toLocaleString()} gp/h
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
