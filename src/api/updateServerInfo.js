// @ts-check
import { GitRefManager } from '../managers/GitRefManager'
import { FileSystem } from '../models/FileSystem.js'
import { assertParameter } from '../utils/assertParameter'
import { join } from '../utils/join.js'

/**
 * Update files required for serving repositories over the "dumb" HTTP protocol. Equivalent to `git update-server-info`.
 *
 * @param {object} args
 * @param {FsClient} args.fs - a file system client
 * @param {string} [args.dir] - The [working tree](dir-vs-gitdir.md) directory path
 * @param {string} [args.gitdir=join(dir,'.git')] - [required] The [git directory](dir-vs-gitdir.md) path
 *
 * @returns {Promise<void>} Resolves successfully when filesystem operations are complete
 *
 * @example
 * await git.updateServerInfo({ fs, dir: '/tutorial' })
 * console.log('done')
 *
 */
export async function updateServerInfo({
  fs: _fs,
  dir,
  gitdir = join(dir, '.git'),
}) {
  try {
    assertParameter('fs', _fs)
    assertParameter('gitdir', gitdir)

    const fs = new FileSystem(_fs)

    let packs = (await fs.readdir(`${gitdir}/objects/pack`))
                    .map((packFileName) => `P pack-${packFileName}`).join('\n') + '\n';

    let refs = (await Promise.all(
        (await GitRefManager.listRefs({ fs, gitdir, filepath: 'refs' }))
            .map(async (refName) => {
                let resolved = await GitRefManager.resolve({ fs, gitdir, ref: refName });
                return `${resolved}\trefs/${refName}`;
            })
    )).join('\n') + '\n';

    await fs._writeFile(`${gitdir}/objects/info/packs`, packs);
    await fs._writeFile(`${gitdir}/info/refs`, refs);
  } catch (err) {
    err.caller = 'git.updateServerInfo'
    throw err
  }
}
