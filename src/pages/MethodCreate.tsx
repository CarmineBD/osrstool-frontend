import { MethodUpsert } from "./MethodUpsert";

export type Props = Record<string, never>;

export function MethodCreate(_props: Props) {
  void _props;
  return <MethodUpsert mode="create" />;
}

export default MethodCreate;
