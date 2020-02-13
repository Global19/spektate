import { Request, Response } from "express";
import Deployment from "spektate/lib/Deployment";
import AzureDevOpsPipeline from "spektate/lib/pipeline/AzureDevOpsPipeline";
import { IAuthor } from "spektate/lib/repository/Author";
import * as config from "./config";

export interface IDeploymentEx extends Deployment {
  durationInMins?: string;
  statusString?: string;
  endTimestamp?: string;
}

const createSourcePipeline = () => {
  return new AzureDevOpsPipeline(
    config.AZURE_ORG,
    config.AZURE_PROJECT,
    false,
    config.AZURE_PIPELINE_ACCESS_TOKEN,
    config.SOURCE_REPO_ACCESS_TOKEN || config.AZURE_PIPELINE_ACCESS_TOKEN
  );
};

const createHLDPipeline = () => {
  return new AzureDevOpsPipeline(
    config.AZURE_ORG,
    config.AZURE_PROJECT,
    true,
    config.AZURE_PIPELINE_ACCESS_TOKEN
  );
};

const createClusterPipeline = () => {
  return new AzureDevOpsPipeline(
    config.AZURE_ORG,
    config.AZURE_PROJECT,
    false,
    config.AZURE_PIPELINE_ACCESS_TOKEN
  );
};

export const get = async (req: Request, res: Response) => {
  res.header("Access-Control-Allow-Origin", "*");
  if (config.isValuesValid()) {
    const srcPipeline = createSourcePipeline();
    const hldPipeline = createHLDPipeline();
    const clusterPipeline = createClusterPipeline();

    const deployments: IDeploymentEx[] = await Deployment.getDeployments(
      config.STORAGE_ACCOUNT_NAME,
      config.STORAGE_ACCOUNT_KEY,
      config.STORAGE_TABLE_NAME,
      config.STORAGE_PARTITION_KEY,
      srcPipeline,
      hldPipeline,
      clusterPipeline,
      undefined
    );

    deployments.forEach(d => {
      d.durationInMins = d.duration();
      d.statusString = d.status();
      d.endTimestamp = d.endTime().toUTCString();
    });

    await Promise.all(
      deployments.map(d => {
        return new Promise(resolve => {
          d.fetchAuthor()
            .then((author: IAuthor) => {
              resolve();
            })
            .catch(e => {
              console.log(e);
              resolve();
            });
        });
      })
    );

    res.json(deployments);
  } else {
    res.status(500).send("Server is not setup correctly");
  }
};