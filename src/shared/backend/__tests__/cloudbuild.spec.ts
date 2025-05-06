import { gql } from "@apollo/client";
import { createExecutor } from "test-utils/backend";
import nock from "nock";
import md5 from "md5";

const backend = createExecutor();

describe("Cloudbuild Query", () => {
  describe("cloudbuildTargets", () => {
    it("should return the mixed targets with releases from cloudbuild and github", async () => {
      const { nockDone } = await nock.back(
        "cloudbuild-targets-github-releases.json"
      );
      const { data, errors } = await backend.query({
        query: gql`
          query {
            cloudTargets {
              releases {
                id
                name
                isPrerelease
                timestamp
                excludeTargets
              }
              targets {
                id
                name
                tags
              }
              flags {
                id
                values
              }
              tags {
                id
                tagFlags {
                  id
                  values
                }
              }
            }
          }
        `,
      });
      expect(errors).toBeFalsy();
      expect(data?.cloudTargets).toMatchInlineSnapshot(`
        {
          "flags": [
            {
              "id": "language",
              "values": [
                "EN",
                "CZ",
                "DA",
                "DE",
                "EN",
                "ES",
                "FI",
                "FR",
                "IT",
                "PT",
                "SK",
                "SE",
                "PL",
                "HU",
                "NL",
              ],
            },
          ],
          "releases": [
            {
              "excludeTargets": [],
              "id": "nightly",
              "isPrerelease": true,
              "name": "nightly",
              "timestamp": "2023-09-01T02:28:49Z",
            },
            {
              "excludeTargets": [
                "tlitef4",
              ],
              "id": "v2.8.4",
              "isPrerelease": false,
              "name": "EdgeTX "Flying Dutchman" v2.8.4",
              "timestamp": "2023-05-16T10:02:42Z",
            },
          ],
          "tags": [
            {
              "id": "colorlcd",
              "tagFlags": [
                {
                  "id": "language",
                  "values": [
                    "CN",
                    "JP",
                    "TW",
                  ],
                },
              ],
            },
          ],
          "targets": [
            {
              "id": "boxer",
              "name": "RadioMaster Boxer",
              "tags": [],
            },
            {
              "id": "commando8",
              "name": "iFlight Commando 8",
              "tags": [],
            },
            {
              "id": "el18",
              "name": "Flysky EL18",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "lr3pro",
              "name": "BETAFPV LiteRadio 3 Pro",
              "tags": [],
            },
            {
              "id": "nv14",
              "name": "Flysky NV14",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "t12",
              "name": "Jumper T12",
              "tags": [],
            },
            {
              "id": "t16",
              "name": "Jumper T16",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "t18",
              "name": "Jumper T18",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "t8",
              "name": "Radiomaster T8",
              "tags": [],
            },
            {
              "id": "tlite",
              "name": "Jumper T-Lite",
              "tags": [],
            },
            {
              "id": "tlitef4",
              "name": "Jumper T-Lite (F4 MCU)",
              "tags": [],
            },
            {
              "id": "tpro",
              "name": "Jumper T-Pro",
              "tags": [],
            },
            {
              "id": "tx12",
              "name": "Radiomaster TX12MK2",
              "tags": [],
            },
            {
              "id": "tx16s",
              "name": "RadioMaster TX16S",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "x10",
              "name": "FrSky Horus X10",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "x10-access",
              "name": "FrSky Horus X10 Access",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "x12s",
              "name": "FrSky Horus X12S",
              "tags": [
                "colorlcd",
              ],
            },
            {
              "id": "x7",
              "name": "FrSky QX7",
              "tags": [],
            },
            {
              "id": "x7-access",
              "name": "FrSky QX7 Access",
              "tags": [],
            },
            {
              "id": "x9d",
              "name": "FrSky X9D",
              "tags": [],
            },
            {
              "id": "x9dp",
              "name": "FrSky X9D Plus",
              "tags": [],
            },
            {
              "id": "x9dp2019",
              "name": "FrSky X9D Plus 2019",
              "tags": [],
            },
            {
              "id": "x9e",
              "name": "FrSky X9E",
              "tags": [],
            },
            {
              "id": "x9lite",
              "name": "FrSky X9 Lite",
              "tags": [],
            },
            {
              "id": "x9lites",
              "name": "FrSky X9 Lite S",
              "tags": [],
            },
            {
              "id": "xlite",
              "name": "FrSky X-Lite",
              "tags": [],
            },
            {
              "id": "xlites",
              "name": "FrSky X-Lite S",
              "tags": [],
            },
            {
              "id": "zorro",
              "name": "RadioMaster Zorro",
              "tags": [],
            },
          ],
        }
      `);
      nockDone();
    });
  });

  describe("cloudbuildFirmwareStatus", () => {
    it("should return a status with build success and download url", async () => {
      const { nockDone } = await nock.back("cloudbuild-job-status.json");

      const { data, errors } = await backend.query({
        query: gql`
          query CloudFirmware($params: CloudFirmwareParams!) {
            cloudFirmware(params: $params) {
              status
              downloadUrl
              base64Data
            }
          }
        `,
        variables: {
          params: {
            release: "v2.8.4",
            target: "boxer",
            flags: [{ name: "language", value: "FR" }],
          },
        },
      });

      expect(errors).toBeFalsy();
      const cloudFirmware = data?.cloudFirmware as any;
      expect(cloudFirmware.status).toEqual("BUILD_SUCCESS");
      expect(cloudFirmware.downloadUrl).toMatchInlineSnapshot(
        `"https://test-cloudbuild.edgetx.org/da28e356449e54c57f0e5e356bd5ec5709128ff7-fe4a260cd3251164f544654df3504a9c5d7f1e0b0d8a565941415ed4e9b8e042.bin"`
      );
      expect(md5(cloudFirmware.base64Data as string)).toMatchInlineSnapshot(
        '"ad9d2d0efef4247c9065a8a175c540a9"'
      );

      nockDone();
    });
  });

  describe("cloudbuildFirmwareCreate", () => {
    it("should return a status with build success and download url", async () => {
      const { nockDone } = await nock.back("cloudbuild-job-create.json");

      const { data, errors } = await backend.mutate({
        mutation: gql`
          mutation CreateCloudFirmware($params: CloudFirmwareParams!) {
            createCloudFirmware(params: $params) {
              status
              downloadUrl
            }
          }
        `,
        variables: {
          params: {
            release: "v2.11.0",
            target: "boxer",
            flags: [{ name: "language", value: "FR" }],
          },
        },
      });

      expect(errors).toBeFalsy();
      const cloudFirmware = data?.createCloudFirmware as any;
      expect(cloudFirmware.status).toEqual("BUILD_SUCCESS");
      expect(cloudFirmware.downloadUrl).toMatchInlineSnapshot(
        `"https://test-cloudbuild.edgetx.org/8369a2e23a7253a9ea4c9a8cb7c80e5fcf23d235-fe4a260cd3251164f544654df3504a9c5d7f1e0b0d8a565941415ed4e9b8e042.bin"`
      );

      nockDone();
    });
  });
});
