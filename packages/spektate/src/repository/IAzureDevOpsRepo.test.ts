import { AxiosResponse } from "axios";
import * as fs from "fs";
import * as path from "path";
import { HttpHelper } from "../HttpHelper";
import { IAuthor } from "./Author";
import {
  getAuthor,
  getManifestSyncState,
  getPullRequest,
  getReleasesURL,
  IAzureDevOpsRepo
} from "./IAzureDevOpsRepo";
import { ITag } from "./Tag";

let authorRawResponse = {};
let syncTagRawResponse = {};
let manifestSyncTagResponse = {};
let prRawResponse = {};
const mockDirectory = path.join("src", "repository", "mocks");
const repo: IAzureDevOpsRepo = {
  org: "org",
  project: "project",
  repo: "repo"
};

beforeAll(() => {
  authorRawResponse = JSON.parse(
    fs.readFileSync(
      path.join(mockDirectory, "azdo-author-response.json"),
      "utf-8")
  );
  syncTagRawResponse = JSON.parse(
    fs.readFileSync(
      path.join(mockDirectory, "azdo-sync-response.json"),
      "utf-8")
  );
  manifestSyncTagResponse = JSON.parse(
    fs.readFileSync(
      path.join(mockDirectory, "azdo-manifest-sync-tag-response.json"),
      "utf-8"
    )
  );
  prRawResponse = JSON.parse(
    fs.readFileSync(
      path.join(mockDirectory, "azdo-pr-response.json"),
      "utf-8")
  );
});

const mockedFunction = <T>(theUrl: string, accessToken?: string): Promise<AxiosResponse<T>> => {
  if (theUrl.includes("commits")) {
    return getAxiosResponseForObject(authorRawResponse);
  } else if (theUrl.includes("annotatedtags")) {
    return getAxiosResponseForObject(manifestSyncTagResponse);
  } else if (theUrl.includes("pullrequests")) {
    return getAxiosResponseForObject(prRawResponse);
  }
  return getAxiosResponseForObject(syncTagRawResponse);
};

const mockedEmptyResponse = <T>(theUrl: string, accessToken?: string): Promise<AxiosResponse<T>> => {
  if (theUrl.endsWith("annotatedtags")) {
    return getAxiosResponseForObject([]);
  } else if (theUrl.includes("pullrequests")) {
    return getAxiosResponseForObject(undefined);
  }
  return getAxiosResponseForObject([]);
};

const mockedErrorResponse = <T>(theUrl: string, accessToken?: string): Promise<AxiosResponse<T>> => {
  if (theUrl.endsWith("annotatedtags")) {
    return getAxiosResponseForObject([]);
  } else if (theUrl.includes("pullrequests")) {
    throw new Error("Request failed with Network error");
  }
  return getAxiosResponseForObject([]);
};

describe("IAzureDevOpsRepo", () => {
  test("gets author correctly", async () => {
    jest.spyOn(HttpHelper, "httpGet").mockImplementationOnce(mockedFunction);
    const author = await getAuthor(repo, "commit");
    expect(author).toBeDefined();
    expect(author!.name).toBe("Samiya Akhtar");
    expect(author!.url).toBeDefined();
    expect(author!.username).toBe("saakhta@microsoft.com");
    expect(author!.imageUrl).toBeTruthy();
  });
});

describe("IAzureDevOpsRepo", () => {
  test("gets PR correctly", async () => {
    jest.spyOn(HttpHelper, "httpGet").mockImplementationOnce(mockedFunction);
    const pr = await getPullRequest(repo, "prid");
    expect(pr).toBeDefined();
    expect(pr.mergedBy).toBeDefined();
    expect(pr!.mergedBy!.name).toBe("Samiya Akhtar");
    expect(pr!.mergedBy!.username).toBe("saakhta@microsoft.com");
    expect(pr!.mergedBy!.url).toBeDefined();
    expect(pr!.mergedBy!.imageUrl).toBeDefined();
    expect(pr!.url).toBeDefined();
    expect(pr!.title).toBe(
      "Updating samiya.frontend image tag to master-20200317.12."
    );
    expect(pr!.sourceBranch).toBe(
      "DEPLOY/samiya2019-samiya.frontend-master-20200317.12"
    );
    expect(pr!.targetBranch).toBe("master");
    expect(pr!.id).toBe(1354);
    expect(pr!.description).toBeDefined();
    jest.spyOn(HttpHelper, "httpGet").mockClear();
  });
  test("negative tests", async () => {
    jest.spyOn(HttpHelper, "httpGet").mockImplementation(mockedEmptyResponse);
    let flag = 0;
    try {
      expect(await getPullRequest(repo, "prid")).toThrow();
    } catch (e) {
      flag = 1;
    }
    expect(flag).toBe(1);
    jest.spyOn(HttpHelper, "httpGet").mockClear();

    jest.spyOn(HttpHelper, "httpGet").mockImplementation(mockedErrorResponse);
    flag = 0;
    try {
      expect(await getPullRequest(repo, "prid")).toThrow();
    } catch (e) {
      flag = 1;
    }
    expect(flag).toBe(1);
    jest.spyOn(HttpHelper, "httpGet").mockClear();
  });
});

describe("IAzureDevOpsRepo", () => {
  test("gets manifest sync tag correctly", async () => {
    jest.spyOn(HttpHelper, "httpGet").mockImplementation(mockedFunction);
    const tags = await getManifestSyncState(repo);
    expect(tags).toHaveLength(1);
    expect(tags[0].commit).toBe("ab4c9f1");
    expect(tags[0].name).toBe("SYNC");
  });
  test("negative tests", async () => {
    jest.spyOn(HttpHelper, "httpGet").mockImplementation(mockedEmptyResponse);
    const tags = await getManifestSyncState(repo);
    expect(tags).toHaveLength(0);
  });
});

describe("IAzureDevOpsRepo", () => {
  test("gets releases URL correctly", async () => {
    const releaseUrl = getReleasesURL(repo);
    expect(releaseUrl).toBe("https://dev.azure.com/org/project/_git/repo/tags");
  });
});

const getAxiosResponseForObject = <T>(obj: any): Promise<AxiosResponse<T>> => {
  return new Promise(resolve => {
    const response: AxiosResponse<any> = {
      config: {},
      data: obj,
      headers: "",
      status: 200,
      statusText: ""
    };
    resolve(response);
  });
};
