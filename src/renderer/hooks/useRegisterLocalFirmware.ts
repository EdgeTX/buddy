import { gql, useMutation } from "@apollo/client";

/** Registers raw firmware bytes as local firmware, returning its new id
 * (same registry backing the "Local file" tab, keyed by md5 hash). */
const useRegisterLocalFirmware = (): {
  registerLocalFirmware: (
    name: string,
    base64Data: string
  ) => Promise<string | undefined>;
  loading: boolean;
} => {
  const [mutate, { loading }] = useMutation(
    gql(/* GraphQL */ `
      mutation RegisterLocalFirmwareForSplash($name: String!, $data: String!) {
        registerLocalFirmware(firmwareBase64Data: $data, fileName: $name) {
          id
        }
      }
    `)
  );

  const registerLocalFirmware = async (
    name: string,
    base64Data: string
  ): Promise<string | undefined> => {
    const response = await mutate({
      variables: { name, data: base64Data },
    });
    return response.data?.registerLocalFirmware.id.toString();
  };

  return { registerLocalFirmware, loading };
};

export default useRegisterLocalFirmware;
