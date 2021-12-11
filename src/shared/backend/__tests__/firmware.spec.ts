import { describe, expect, it } from "@jest/globals";
import gql from "graphql-tag";
import { createExecutor } from "test-utils/backend";
import nock from "nock";

const backend = createExecutor();

describe("Query", () => {
  describe("edgeTxReleases", () => {
    it("should return the releases from the edgetx github project", async () => {
      const { nockDone } = await nock.back("firmware-releases.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxReleases {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxReleases).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "nightly",
            "name": "nightly",
          },
          Object {
            "id": "v2.5.0",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0",
          },
          Object {
            "id": "v2.5.0-rc3",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0-RC3",
          },
          Object {
            "id": "v2.5.0-rc2",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0-RC2",
          },
          Object {
            "id": "v2.5.0-rc1",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0-RC1",
          },
          Object {
            "id": "v2.4.0",
            "name": "EdgeTX \\"Endeavour\\" 2.4.0",
          },
          Object {
            "id": "v2.4.0-rc4",
            "name": "EdgeTX Endeavour (2.4.0) RC4",
          },
          Object {
            "id": "v2.4.0-rc3",
            "name": "EdgeTX Endeavour (2.4.0) RC3",
          },
          Object {
            "id": "v2.4.0-rc2",
            "name": "EdgeTX Endeavour (2.4.0) RC2",
          },
          Object {
            "id": "v2.4.0-rc1",
            "name": "2.4.0-rc1",
          },
        ]
      `);

      nockDone();
    });
  });

  describe("edgeTxRelease", () => {
    it("should return the edgetx release with the given tag id", async () => {
      const { nockDone } = await nock.back("firmware-by-tag-id.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxRelease(id: "v2.5.0") {
              id
              name
              description
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxRelease).toEqual({
        id: "v2.5.0",
        name: 'EdgeTX "Dauntless" 2.5.0',
        description: expect.any(String),
      });
      nockDone();
    });
  });

  describe("firmwareBundleTargets", () => {
    it("should return the targets by reading the firmware bundle", async () => {
      const { nockDone } = await nock.back("firmware-with-targets.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxRelease(id: "v2.5.0") {
              id
              name
              firmwareBundle {
                targets {
                  id
                  name
                }
              }
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxRelease).toMatchInlineSnapshot(`
        Object {
          "firmwareBundle": Object {
            "targets": Array [
              Object {
                "id": "nv14",
                "name": "Flysky NV14",
              },
              Object {
                "id": "x10",
                "name": "Frsky Horus X10",
              },
              Object {
                "id": "x10-access",
                "name": "Frsky Horus X10 Access",
              },
              Object {
                "id": "x12s",
                "name": "Frsky Horus X12s",
              },
              Object {
                "id": "x7",
                "name": "Frsky QX7",
              },
              Object {
                "id": "x7-access",
                "name": "Frsky QX7 Access",
              },
              Object {
                "id": "x9d",
                "name": "Frsky X9D",
              },
              Object {
                "id": "x9dp",
                "name": "Frsky X9D Plus",
              },
              Object {
                "id": "x9dp2019",
                "name": "Frsky X9D Plus 2019",
              },
              Object {
                "id": "x9lite",
                "name": "Frsky X9 Lite",
              },
              Object {
                "id": "x9lites",
                "name": "Frsky X9 Lite S",
              },
              Object {
                "id": "xlite",
                "name": "Frsky X-Lite",
              },
              Object {
                "id": "xlites",
                "name": "Frsky X-Lite S",
              },
              Object {
                "id": "t8",
                "name": "Jumper T8",
              },
              Object {
                "id": "t12",
                "name": "Jumper T12",
              },
              Object {
                "id": "t16",
                "name": "Jumper T16",
              },
              Object {
                "id": "t18",
                "name": "Jumper T18",
              },
              Object {
                "id": "tlite",
                "name": "Jumper T-Lite",
              },
              Object {
                "id": "tx12",
                "name": "Radiomaster TX12",
              },
              Object {
                "id": "tx16s",
                "name": "Radiomaster TX16s",
              },
            ],
          },
          "id": "v2.5.0",
          "name": "EdgeTX \\"Dauntless\\" 2.5.0",
        }
      `);
      nockDone();
    });
  });

  describe("firmwareBundleTarget", () => {
    it("should return the target details by reading the firmware bundle", async () => {
      const { nockDone } = await nock.back("firmware-with-targets.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxRelease(id: "v2.5.0") {
              id
              name
              firmwareBundle {
                target(id: "t8") {
                  id
                  name
                }
              }
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxRelease).toMatchInlineSnapshot(`
        Object {
          "firmwareBundle": Object {
            "target": Object {
              "id": "t8",
              "name": "Jumper T8",
            },
          },
          "id": "v2.5.0",
          "name": "EdgeTX \\"Dauntless\\" 2.5.0",
        }
      `);
      nockDone();
    });

    it("should return null if the the target doesnt exist in the firmware bundle", async () => {
      const { nockDone } = await nock.back("firmware-with-targets.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxRelease(id: "v2.5.0") {
              id
              name
              firmwareBundle {
                target(id: "some-weird-radio-id") {
                  id
                  name
                }
              }
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxRelease).toMatchInlineSnapshot(`
        Object {
          "firmwareBundle": Object {
            "target": null,
          },
          "id": "v2.5.0",
          "name": "EdgeTX \\"Dauntless\\" 2.5.0",
        }
      `);
      nockDone();
    });
  });
});

describe("Mutation", () => {
  describe("registerLocalFirmware", () => {
    it("should store the given firmware data and give it an ID", async () => {
      const base64Data = Buffer.from("some-firmware-data").toString("base64");
      const mutation = await backend.mutate({
        mutation: gql`
          mutation UploadFirmware($data: String!) {
            registerLocalFirmware(firmwareBase64Data: $data) {
              id
            }
          }
        `,
        variables: {
          data: base64Data,
        },
      });

      expect(mutation.errors).toBeFalsy();
      const { id } = mutation.data?.registerLocalFirmware as { id: string };

      const response = await backend.query({
        query: gql`
          query QueryLocalFirmware($id: ID!) {
            localFirmware(byId: $id) {
              id
              base64Data
            }
          }
        `,
        variables: {
          id,
        },
      });

      expect(response.errors).toBeFalsy();
      expect(response.data?.localFirmware).toEqual({
        id,
        base64Data,
      });
    });
  });
});
