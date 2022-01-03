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

    describe("firmewareBundle", () => {
      it("should return the targets by reading the release firmware bundle", async () => {
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

      describe("targets", () => {
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
  });

  describe("edgeTxPrs", () => {
    it("should return a list of open PRs", async () => {
      const { nockDone } = await nock.back("edgetx-prs.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxPrs {
              id
              name
              headCommitId
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect((data?.edgeTxPrs as any[]).slice(5)).toMatchInlineSnapshot(`
        Array [
          Object {
            "headCommitId": "7c1aad8bd68d48669af3b820526697778161d51c",
            "id": "1189",
            "name": "jfrickmann:GlobalVars",
          },
          Object {
            "headCommitId": "08d9b326668007170d25582c75e45009862f501c",
            "id": "952",
            "name": "EdgeTX:pfeerick/issue774",
          },
          Object {
            "headCommitId": "ffdeb1130b3bea041be4aaa5a31efb0f23a3b9d3",
            "id": "953",
            "name": "EdgeTX:pfeerick/issue776",
          },
          Object {
            "headCommitId": "6d9ef6089b1b09304ab9a5305cec980656251627",
            "id": "881",
            "name": "elecpower:fix-836-nv14-modules",
          },
          Object {
            "headCommitId": "414685b7f7dcd4c3d4a73b7bd6a06a94d6a1b8c7",
            "id": "1089",
            "name": "EdgeTX:serial-refactor",
          },
          Object {
            "headCommitId": "0565689d77ceca087e73995bf1e1857cce43081a",
            "id": "1035",
            "name": "richardclli:tidy-up-translations",
          },
          Object {
            "headCommitId": "0d4ee8b26bdcb5707fc3b796e163785528354538",
            "id": "1233",
            "name": "daleckystepan:ghst12bit",
          },
          Object {
            "headCommitId": "b1f04c559cad5c00cf9b260149e3fbfc2e7ae151",
            "id": "1293",
            "name": "EdgeTX:fix-simu-conversion",
          },
          Object {
            "headCommitId": "1715f61eef371e82b896ad08303ff24087eb8fc0",
            "id": "1212",
            "name": "eshifri:eshifri/NV14_range_value",
          },
          Object {
            "headCommitId": "0d7944649f71d8a81b26207739ae60ef6132c3f0",
            "id": "987",
            "name": "EdgeTX:test-2.5.1-build-image",
          },
          Object {
            "headCommitId": "317fe561d502c97589e0e30533b8e09cc94734f4",
            "id": "853",
            "name": "EdgeTX:boot_speedup",
          },
          Object {
            "headCommitId": "15e9e592917d5bad1d1e4b5f022a42133c669178",
            "id": "1289",
            "name": "eshifri:eshifri/stuck_key_test",
          },
          Object {
            "headCommitId": "34f3e3900f22d46cabe1671764a9ab81ec802de6",
            "id": "1304",
            "name": "EdgeTX:throttle-and-switch-warnings",
          },
          Object {
            "headCommitId": "ab8498f86a54c47e26d307a8cd6d3fcc51e15e56",
            "id": "1320",
            "name": "gagarinlg:spi_flash",
          },
          Object {
            "headCommitId": "007eb0ba934c1bb7c5c8cdee9ae5b63af51728ac",
            "id": "1329",
            "name": "eshifri:eshifri/old_RM_FW",
          },
          Object {
            "headCommitId": "b9319c5428aab118b9473e98fcde996355333c8c",
            "id": "1337",
            "name": "wimalopaan:wm1333",
          },
          Object {
            "headCommitId": "b7ffa5f381eaa896b578a9a1647453c69af78a74",
            "id": "502",
            "name": "EdgeTX:tbs-merge",
          },
          Object {
            "headCommitId": "860bc0d61a1b867fb9b9ce85afe67f94a1bca9a7",
            "id": "1338",
            "name": "wimalopaan:wm1317",
          },
          Object {
            "headCommitId": "2fb494bcd58ef958741c012b115ac5db67d19ff5",
            "id": "150",
            "name": "EdgeTX:mavlink-support",
          },
          Object {
            "headCommitId": "80f74057a0cfafa770f2b66fda8d0db8bf3fee5d",
            "id": "1163",
            "name": "kevinkoenig:fix-1100",
          },
          Object {
            "headCommitId": "4a96b68bf9e20a1a6ea498f281e4cce4b0b1ef18",
            "id": "1339",
            "name": "EdgeTX:fix-curve-clear",
          },
          Object {
            "headCommitId": "86b03f96a201e1fec4e3c307017260a2f1336f71",
            "id": "1300",
            "name": "jfrickmann:Issue1285",
          },
        ]
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
