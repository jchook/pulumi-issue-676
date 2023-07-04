import * as pulumi from '@pulumi/pulumi'
import * as aws from '@pulumi/aws'
import * as docker from '@pulumi/docker'

const myName = 'app'
const repository = new aws.ecr.Repository(myName, {
  name: myName,
  tags: {
    Name: myName,
  },
})

const authToken = aws.ecr.getAuthorizationTokenOutput({
  registryId: repository.registryId,
})

const image = new docker.Image(myName, {
  build: {
    args: {
      BUILDKIT_INLINE_CACHE: '1',
    },

    // ERROR!
    //
    // Adding cacheFrom with a reference to `repository` causes this error:
    // error: could not open dockerfile at relative path Dockerfile
    //
    // The bug is not present if:
    // - cacheFrom is removed
    // - cacheFrom input does not reference an uncreated repository
    // - the repository already exists in AWS
    //
    cacheFrom: {
      images: pulumi
        .all([repository.repositoryUrl])
        .apply(([url]) => {
          // I do not see output from this console.log
          console.log('cacheFrom repositoryUrl URL:', url)
          return []
        }),
    },
    context: './app',
  },
  imageName: pulumi.interpolate`${repository.repositoryUrl}:latest`,
  registry: {
    password: pulumi.secret(authToken.password),
    server: repository.repositoryUrl,
    username: authToken.userName,
  },
}, { dependsOn: [repository] })

export const app = {
  authToken,
  image,
  repository,
}
