import JournalCard from "./JournalCard"

function JournalList({ journals, deleteJournal, startEditing }) {
  return (
    <div className="flex flex-col gap-3">
      {journals.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No entries yet. Start writing!</p>
      ) : (
        journals.map((journal) => (
          <JournalCard
            key={journal.id}
            journal={journal}
            deleteJournal={deleteJournal}
            startEditing={startEditing}
          />
        ))
      )}
    </div>
  )
}

export default JournalList
