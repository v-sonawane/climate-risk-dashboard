<tbody className="bg-white divide-y divide-gray-200">
  {recentArticles.map((article, index) => (
    <tr
      key={index}
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => {
        setSelectedArticle(article);
        setActiveTab('articleDetail');
      }}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
        {article.title}
      </td>
      {/* …rest of row… */}
    </tr>
  ))}
</tbody>


if (activeTab === 'articleDetail' && selectedArticle) {
    return (
      <div className="container mx-auto p-6">
        <button
          className="text-blue-600 mb-4"
          onClick={() => {
            setActiveTab('articles');
            setSelectedArticle(null);
          }}
        >
          ← Back to Articles
        </button>
  
        <h2 className="text-2xl font-bold mb-2">
          {selectedArticle.title}
        </h2>
        <p className="text-gray-500 mb-4">
          Source: {selectedArticle.source} — {selectedArticle.date}
        </p>
  
        <div className="prose">
          {articleSummary
            ? articleSummary
            : <em>Loading summary…</em>
          }
        </div>
      </div>
    );
  }
  