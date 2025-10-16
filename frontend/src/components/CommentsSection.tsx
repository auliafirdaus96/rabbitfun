const CommentsSection = () => {
  return (
    <div className="px-4 py-6 text-center text-sm text-muted-foreground flex-1">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
          <span className="text-2xl">💬</span>
        </div>
        <div>
          <h3 className="font-medium text-foreground mb-1">No comments yet</h3>
          <p className="text-muted-foreground">Be the first to share your thoughts about this token!</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
          Write a Comment
        </button>
      </div>
    </div>
  );
};

export default CommentsSection;