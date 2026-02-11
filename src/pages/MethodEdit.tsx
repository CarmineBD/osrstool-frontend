import { MethodUpsert } from "./MethodUpsert";

export type Props = Record<string, never>;

export function MethodEdit(_props: Props) {
  void _props;
  return <MethodUpsert mode="edit" />;
}

export default MethodEdit;
