// Display-only translations. Keep the original errors, requests and retry state intact.
const messages: Record<string, string> = {
  'Study not found': '未找到研究，请检查邀请链接。',
  'Study unavailable': '暂时无法访问研究，请稍后重试。',
  'This study is closed': '该研究已关闭。',
  'Unable to join': '暂时无法参与研究，请稍后重试。',
  'Research services are disabled in this demo.': '此演示未启用数据收集服务。',
  'Failed to fetch': '网络请求失败，请检查连接后重试。',
  'Load failed': '加载失败，请检查网络连接后重试。',
  'NetworkError when attempting to fetch resource.': '网络请求失败，请检查连接后重试。',
  'Storage is not configured': '数据存储尚未配置，请联系网站所有者。',
  'Sign in with ChatGPT first': '请先使用 ChatGPT 登录。',
  'Only the research owner can access this resource': '仅研究所有者有权访问此内容。',
  'This account is not authorized to initialize the research owner': '此账号无权开通研究管理功能。',
  'The research owner has already been assigned': '研究所有者已设置。',
  'Only a published study can be closed': '只有已发布的研究才能关闭。',
  'Published study settings are immutable; clone a new version to edit': '已发布的研究不能修改，请新建草稿版本。',
  'Add and finish uploading all audio before publishing': '请添加音频并完成全部上传后再发布。',
  'Provide config or ordered assetIds': '请提供研究设置或音频顺序。',
  'assetIds must contain every study asset exactly once': '音频列表需包含全部研究音频，且不能重复。',
  'Only draft studies can accept audio': '只有草稿状态的研究可以添加音频。',
  'A study supports up to 100 audio assets': '每项研究最多可添加 100 个音频。',
  'Upload not found': '未找到上传记录。',
  'This upload is no longer editable': '此上传记录已不能修改。',
  'Asset not found': '未找到音频文件。',
  'Study is not editable': '当前研究不能修改。',
  'Upload is incomplete': '上传尚未完成，请继续上传。',
  'Uploaded audio could not be verified': '无法验证上传音频的完整性，请重试。',
  'Only draft assets can be removed': '只有草稿中的音频可以移除。',
  'Audio not found': '未找到音频。',
  'Audio unavailable': '暂时无法读取音频。',
  'Audio metadata timed out.': '读取音频信息超时，请重试。',
  'Audio duration unavailable.': '无法读取音频时长，请检查文件。',
  'This browser cannot play this audio format.': '当前浏览器不支持此音频格式。',
  'Upload interrupted': '上传已中断，请重新选择同一文件继续上传。',
  'Request is too large': '请求数据过大。',
  'Invalid JSON request': '请求数据格式有误。',
  'Invalid request': '请求内容有误，请检查填写的信息。',
  'Invalid cursor': '分页信息无效，请刷新列表。',
  'Cross-origin mutation is not allowed': '无法从当前网址执行此操作，请回到网站后重试。',
  'Endpoint not found': '未找到所请求的服务。',
  'The server could not complete this request. Retry without changing the upload or submission ID.': '服务器暂未完成请求，请重试当前操作，并保持原上传或提交编号不变。',
};

export function localizeUiError(message: string, locale: string): string {
  if (locale !== 'zh-CN') return message;
  for (const [original, translated] of Object.entries(messages)) {
    if (message === original) return translated;
    if (message.endsWith(` ${original}`) || message.endsWith(`：${original}`)) {
      return message.slice(0, -original.length) + translated;
    }
  }
  return message.replace(/Request failed \((\d{3})\)$/, '请求失败（状态码 $1），请稍后重试。');
}
