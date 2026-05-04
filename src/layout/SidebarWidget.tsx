export default function SidebarWidget() {
  return (
    <>
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white justify-center px-1">
        Follow me on social media
      </h3>
      <div
      className={`
      flex flex-col gap-3`}>
      <a
        href="https://www.linkedin.com/in/aziz-shahiwala-ab5b27288/"
  target="_blank"
  rel="nofollow"
  className="flex items-center justify-center px-1 py-1.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200">
  LinkedIn
</a>
<a
        href="https://github.com/Azizshahiwala"
  target="_blank"
  rel="nofollow"
  className="flex items-center justify-center px-1 py-1.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200">
  Github
</a>
<a
        href="https://instagram.com/azizstyle_arts?igsh=aDF1bmYzbGYxN3li"
  target="_blank"
  rel="nofollow"
  className="flex items-center justify-center px-1 py-1.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200">
  Instagram
</a>
    </div>
    </>
  );
}
