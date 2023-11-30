import fs from "fs";

export function updateDeployments(contract: string, address: string) {
    const deployments = JSON.parse(fs.readFileSync("./deployments/deployments.json").toString());
    deployments[contract] = address;
    fs.writeFileSync("./deployments/deployments.json", JSON.stringify(deployments, null, 2));
}

export function getDeploymentAddress(contract: string) {
    const deployments = JSON.parse(fs.readFileSync("./deployments/deployments.json").toString());
    return deployments[contract];
}